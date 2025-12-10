// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title OracleConsumer
 * @notice Interfaces with QIE weather oracles to receive and verify weather data
 * @dev Validates oracle signatures and forwards verified data to PolicyManager
 */
contract OracleConsumer is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Weather parameter types
    enum WeatherParameter {
        TEMPERATURE,
        RAINFALL,
        WIND_SPEED,
        HUMIDITY
    }

    // Weather data request structure
    struct WeatherDataRequest {
        address requester;
        string location;
        WeatherParameter parameterType;
        uint256 timestamp;
        bool fulfilled;
    }

    // State variables
    address public oracleAddress;
    address public policyManager;
    uint256 private requestNonce;

    // Mappings
    mapping(bytes32 => bool) public pendingRequests;
    mapping(bytes32 => WeatherDataRequest) public requests;

    // Events
    event WeatherDataRequested(
        bytes32 indexed requestId,
        address indexed requester,
        string location,
        WeatherParameter parameterType,
        uint256 timestamp
    );

    event WeatherDataFulfilled(
        bytes32 indexed requestId,
        string location,
        WeatherParameter parameterType,
        int256 value,
        uint256 timestamp
    );

    event OracleAddressUpdated(address indexed oldOracle, address indexed newOracle);
    event PolicyManagerUpdated(address indexed oldManager, address indexed newManager);

    // Errors
    error InvalidOracleAddress();
    error InvalidPolicyManager();
    error OnlyOracle();
    error RequestNotPending();
    error InvalidSignature();
    error RequestAlreadyFulfilled();

    /**
     * @notice Constructor to initialize the contract
     * @param _oracleAddress The address of the authorized oracle
     */
    constructor(address _oracleAddress) Ownable(msg.sender) {
        if (_oracleAddress == address(0)) revert InvalidOracleAddress();
        oracleAddress = _oracleAddress;
    }

    /**
     * @notice Request weather data from the oracle
     * @param location The geographic location identifier
     * @param parameterType The type of weather parameter to request
     * @return requestId The unique identifier for this request
     */
    function requestWeatherData(
        string memory location,
        WeatherParameter parameterType
    ) external returns (bytes32 requestId) {
        // Generate unique request ID
        requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                location,
                parameterType,
                block.timestamp,
                requestNonce++
            )
        );

        // Create request
        requests[requestId] = WeatherDataRequest({
            requester: msg.sender,
            location: location,
            parameterType: parameterType,
            timestamp: block.timestamp,
            fulfilled: false
        });

        pendingRequests[requestId] = true;

        emit WeatherDataRequested(
            requestId,
            msg.sender,
            location,
            parameterType,
            block.timestamp
        );

        return requestId;
    }

    /**
     * @notice Fulfill a weather data request (called by oracle)
     * @param requestId The request identifier
     * @param location The geographic location
     * @param parameterType The weather parameter type
     * @param value The weather data value
     * @param timestamp The timestamp of the weather data
     */
    function fulfillWeatherData(
        bytes32 requestId,
        string memory location,
        WeatherParameter parameterType,
        int256 value,
        uint256 timestamp
    ) external onlyOracle {
        if (!pendingRequests[requestId]) revert RequestNotPending();
        if (requests[requestId].fulfilled) revert RequestAlreadyFulfilled();

        // Mark request as fulfilled
        requests[requestId].fulfilled = true;
        pendingRequests[requestId] = false;

        emit WeatherDataFulfilled(
            requestId,
            location,
            parameterType,
            value,
            timestamp
        );

        // Forward to PolicyManager if set
        if (policyManager != address(0)) {
            // Call PolicyManager's evaluatePolicies function
            (bool success, ) = policyManager.call(
                abi.encodeWithSignature(
                    "evaluatePolicies(string,uint8,int256,uint256)",
                    location,
                    uint8(parameterType),
                    value,
                    timestamp
                )
            );
            // Note: We don't revert if the call fails to prevent oracle from being blocked
            // The PolicyManager should handle its own errors
            require(success, "PolicyManager call failed");
        }
    }

    /**
     * @notice Fulfill weather data with signature verification
     * @param requestId The request identifier
     * @param location The geographic location
     * @param parameterType The weather parameter type
     * @param value The weather data value
     * @param timestamp The timestamp of the weather data
     * @param signature The oracle's signature
     */
    function fulfillWeatherDataWithSignature(
        bytes32 requestId,
        string memory location,
        WeatherParameter parameterType,
        int256 value,
        uint256 timestamp,
        bytes memory signature
    ) external {
        // Verify signature
        if (!verifyOracleSignature(requestId, location, parameterType, value, timestamp, signature)) {
            revert InvalidSignature();
        }

        if (!pendingRequests[requestId]) revert RequestNotPending();
        if (requests[requestId].fulfilled) revert RequestAlreadyFulfilled();

        // Mark request as fulfilled
        requests[requestId].fulfilled = true;
        pendingRequests[requestId] = false;

        emit WeatherDataFulfilled(
            requestId,
            location,
            parameterType,
            value,
            timestamp
        );

        // Forward to PolicyManager if set
        if (policyManager != address(0)) {
            (bool success, ) = policyManager.call(
                abi.encodeWithSignature(
                    "evaluatePolicies(string,uint8,int256,uint256)",
                    location,
                    uint8(parameterType),
                    value,
                    timestamp
                )
            );
            require(success, "PolicyManager call failed");
        }
    }

    /**
     * @notice Verify oracle signature on weather data
     * @param requestId The request identifier
     * @param location The geographic location
     * @param parameterType The weather parameter type
     * @param value The weather data value
     * @param timestamp The timestamp of the weather data
     * @param signature The signature to verify
     * @return bool True if signature is valid
     */
    function verifyOracleSignature(
        bytes32 requestId,
        string memory location,
        WeatherParameter parameterType,
        int256 value,
        uint256 timestamp,
        bytes memory signature
    ) public view returns (bool) {
        // Create message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                requestId,
                location,
                uint8(parameterType),
                value,
                timestamp
            )
        );

        // Convert to Ethereum signed message hash
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        // Recover signer from signature
        address signer = ethSignedMessageHash.recover(signature);

        // Verify signer is the authorized oracle
        return signer == oracleAddress;
    }

    /**
     * @notice Set the oracle address (admin only)
     * @param newOracle The new oracle address
     */
    function setOracleAddress(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert InvalidOracleAddress();

        address oldOracle = oracleAddress;
        oracleAddress = newOracle;

        emit OracleAddressUpdated(oldOracle, newOracle);
    }

    /**
     * @notice Set the policy manager address (admin only)
     * @param _policyManager The policy manager contract address
     */
    function setPolicyManager(address _policyManager) external onlyOwner {
        if (_policyManager == address(0)) revert InvalidPolicyManager();

        address oldManager = policyManager;
        policyManager = _policyManager;

        emit PolicyManagerUpdated(oldManager, _policyManager);
    }

    /**
     * @notice Get request details
     * @param requestId The request identifier
     * @return request The request details
     */
    function getRequest(bytes32 requestId) external view returns (WeatherDataRequest memory) {
        return requests[requestId];
    }

    /**
     * @notice Check if a request is pending
     * @param requestId The request identifier
     * @return bool True if request is pending
     */
    function isPending(bytes32 requestId) external view returns (bool) {
        return pendingRequests[requestId];
    }

    /**
     * @notice Modifier to restrict access to oracle only
     */
    modifier onlyOracle() {
        if (msg.sender != oracleAddress) revert OnlyOracle();
        _;
    }
}

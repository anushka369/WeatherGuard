// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OracleConsumer.sol";

/**
 * @title OracleConsumerTest
 * @notice Test suite for OracleConsumer contract
 */
contract OracleConsumerTest is Test {
    OracleConsumer public oracleConsumer;
    
    address public admin;
    address public oracle;
    uint256 public oraclePrivateKey;
    address public policyManager;
    address public user;
    address public attacker;
    uint256 public attackerPrivateKey;

    function setUp() public {
        admin = makeAddr("admin");
        user = makeAddr("user");
        policyManager = makeAddr("policyManager");
        
        // Create oracle with known private key for signing
        oraclePrivateKey = 0x1234;
        oracle = vm.addr(oraclePrivateKey);
        
        // Create attacker with different private key
        attackerPrivateKey = 0x5678;
        attacker = vm.addr(attackerPrivateKey);
        
        // Deploy contract as admin
        vm.prank(admin);
        oracleConsumer = new OracleConsumer(oracle);
        
        // Set policy manager
        vm.prank(admin);
        oracleConsumer.setPolicyManager(policyManager);
    }

    /**
     * Feature: weather-insurance-dapp, Property 6: Oracle signature verification prevents unauthorized data
     * Validates: Requirements 2.5
     * 
     * For any weather data submission without a valid oracle signature, the system should reject 
     * the data and not process any policy evaluations based on it.
     */
    function testFuzz_OracleSignatureVerificationPreventsUnauthorizedData(
        string memory location,
        uint8 parameterType,
        int256 value,
        uint256 timestamp
    ) public {
        // Bound parameter type to valid enum range
        parameterType = uint8(bound(parameterType, 0, 3));
        OracleConsumer.WeatherParameter weatherParam = OracleConsumer.WeatherParameter(parameterType);
        
        // Bound timestamp to reasonable range
        timestamp = bound(timestamp, block.timestamp, block.timestamp + 365 days);
        
        // User requests weather data
        vm.prank(user);
        bytes32 requestId = oracleConsumer.requestWeatherData(location, weatherParam);
        
        // Verify request is pending
        assertTrue(oracleConsumer.isPending(requestId), "Request should be pending");
        
        // Test invalid signature rejection
        _testInvalidSignatureRejection(requestId, location, parameterType, value, timestamp, weatherParam);
        
        // Test valid signature acceptance
        _testValidSignatureAcceptance(requestId, location, parameterType, value, timestamp, weatherParam);
    }
    
    function _testInvalidSignatureRejection(
        bytes32 requestId,
        string memory location,
        uint8 parameterType,
        int256 value,
        uint256 timestamp,
        OracleConsumer.WeatherParameter weatherParam
    ) internal {
        // Create message hash for signing
        bytes32 messageHash = keccak256(
            abi.encodePacked(requestId, location, parameterType, value, timestamp)
        );
        
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        
        // Attacker tries to sign with their own key (invalid signature)
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attackerPrivateKey, ethSignedMessageHash);
        bytes memory invalidSignature = abi.encodePacked(r, s, v);
        
        // Attempt to fulfill with invalid signature should revert
        vm.expectRevert(OracleConsumer.InvalidSignature.selector);
        oracleConsumer.fulfillWeatherDataWithSignature(
            requestId, location, weatherParam, value, timestamp, invalidSignature
        );
        
        // Verify request is still pending
        assertTrue(oracleConsumer.isPending(requestId), "Request should still be pending");
        assertFalse(oracleConsumer.getRequest(requestId).fulfilled, "Request should not be fulfilled");
    }
    
    function _testValidSignatureAcceptance(
        bytes32 requestId,
        string memory location,
        uint8 parameterType,
        int256 value,
        uint256 timestamp,
        OracleConsumer.WeatherParameter weatherParam
    ) internal {
        // Create message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(requestId, location, parameterType, value, timestamp)
        );
        
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        
        // Oracle signs with correct key
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(oraclePrivateKey, ethSignedMessageHash);
        bytes memory validSignature = abi.encodePacked(r, s, v);
        
        // Mock PolicyManager call
        vm.mockCall(
            policyManager,
            abi.encodeWithSignature(
                "evaluatePolicies(string,uint8,int256,uint256)",
                location, parameterType, value, timestamp
            ),
            abi.encode(true)
        );
        
        // Fulfill with valid signature should succeed
        oracleConsumer.fulfillWeatherDataWithSignature(
            requestId, location, weatherParam, value, timestamp, validSignature
        );
        
        // Verify request is fulfilled
        assertFalse(oracleConsumer.isPending(requestId), "Request should not be pending");
        assertTrue(oracleConsumer.getRequest(requestId).fulfilled, "Request should be fulfilled");
    }

    /**
     * Additional test: Signature verification function returns correct boolean
     */
    function testFuzz_VerifyOracleSignatureReturnsCorrectBoolean(
        uint8 parameterType,
        int256 value,
        uint256 timestamp
    ) public {
        // Bound inputs
        parameterType = uint8(bound(parameterType, 0, 3));
        timestamp = bound(timestamp, block.timestamp, block.timestamp + 365 days);
        
        string memory location = "TestLocation";
        OracleConsumer.WeatherParameter weatherParam = OracleConsumer.WeatherParameter(parameterType);
        
        // Create request
        vm.prank(user);
        bytes32 requestId = oracleConsumer.requestWeatherData(location, weatherParam);
        
        // Create signatures
        bytes memory validSig = _createSignature(requestId, location, parameterType, value, timestamp, oraclePrivateKey);
        bytes memory invalidSig = _createSignature(requestId, location, parameterType, value, timestamp, attackerPrivateKey);
        
        // Should return true for valid signature
        assertTrue(
            oracleConsumer.verifyOracleSignature(requestId, location, weatherParam, value, timestamp, validSig),
            "Valid signature should return true"
        );
        
        // Should return false for invalid signature
        assertFalse(
            oracleConsumer.verifyOracleSignature(requestId, location, weatherParam, value, timestamp, invalidSig),
            "Invalid signature should return false"
        );
    }
    
    function _createSignature(
        bytes32 requestId,
        string memory location,
        uint8 parameterType,
        int256 value,
        uint256 timestamp,
        uint256 privateKey
    ) internal pure returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(requestId, location, parameterType, value, timestamp));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    /**
     * Additional test: Oracle can fulfill without signature using onlyOracle modifier
     */
    function testFuzz_OracleCanFulfillWithoutSignature(
        uint8 parameterType,
        int256 value
    ) public {
        // Bound inputs
        parameterType = uint8(bound(parameterType, 0, 3));
        
        string memory location = "TestLocation";
        uint256 timestamp = block.timestamp;
        OracleConsumer.WeatherParameter weatherParam = OracleConsumer.WeatherParameter(parameterType);
        
        // Create request
        vm.prank(user);
        bytes32 requestId = oracleConsumer.requestWeatherData(location, weatherParam);
        
        // Mock PolicyManager call
        vm.mockCall(
            policyManager,
            abi.encodeWithSignature(
                "evaluatePolicies(string,uint8,int256,uint256)",
                location, parameterType, value, timestamp
            ),
            abi.encode(true)
        );
        
        // Oracle can fulfill directly without signature
        vm.prank(oracle);
        oracleConsumer.fulfillWeatherData(requestId, location, weatherParam, value, timestamp);
        
        // Verify fulfilled
        assertTrue(oracleConsumer.getRequest(requestId).fulfilled, "Request should be fulfilled by oracle");
    }

    /**
     * Additional test: Non-oracle cannot fulfill without valid signature
     */
    function test_NonOracleCannotFulfillWithoutSignature() public {
        string memory location = "New York";
        OracleConsumer.WeatherParameter weatherParam = OracleConsumer.WeatherParameter.TEMPERATURE;
        
        // Create request
        vm.prank(user);
        bytes32 requestId = oracleConsumer.requestWeatherData(location, weatherParam);
        
        // Attacker tries to fulfill without signature
        vm.prank(attacker);
        vm.expectRevert(OracleConsumer.OnlyOracle.selector);
        oracleConsumer.fulfillWeatherData(
            requestId,
            location,
            weatherParam,
            25,
            block.timestamp
        );
        
        // Verify not fulfilled
        OracleConsumer.WeatherDataRequest memory request = oracleConsumer.getRequest(requestId);
        assertFalse(request.fulfilled, "Request should not be fulfilled by non-oracle");
    }

    /**
     * Feature: weather-insurance-dapp, Property 14: Configuration updates are restricted to admin (oracle address portion)
     * Validates: Requirements 5.1
     * 
     * For any configuration change attempt (oracle address) by a non-admin address, the system 
     * should reject the change and maintain the current configuration unchanged.
     */
    function testFuzz_AdminOnlyOracleConfiguration(address newOracle) public {
        // Ensure newOracle is not zero address
        vm.assume(newOracle != address(0));
        vm.assume(newOracle != attacker); // Ensure it's different from attacker for clarity
        
        // Record current oracle address
        address currentOracle = oracleConsumer.oracleAddress();
        assertEq(currentOracle, oracle, "Initial oracle should be set");
        
        // Non-admin (attacker) tries to update oracle address
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", attacker));
        oracleConsumer.setOracleAddress(newOracle);
        
        // Verify oracle address unchanged
        assertEq(oracleConsumer.oracleAddress(), currentOracle, "Oracle address should be unchanged after non-admin attempt");
        
        // Admin can update oracle address
        vm.prank(admin);
        oracleConsumer.setOracleAddress(newOracle);
        
        // Verify oracle address updated
        assertEq(oracleConsumer.oracleAddress(), newOracle, "Oracle address should be updated by admin");
    }

    /**
     * Additional test: Admin cannot set zero address as oracle
     */
    function test_CannotSetZeroAddressAsOracle() public {
        vm.prank(admin);
        vm.expectRevert(OracleConsumer.InvalidOracleAddress.selector);
        oracleConsumer.setOracleAddress(address(0));
        
        // Verify oracle unchanged
        assertEq(oracleConsumer.oracleAddress(), oracle, "Oracle should remain unchanged");
    }

    /**
     * Additional test: Admin can update policy manager
     */
    function testFuzz_AdminCanUpdatePolicyManager(address newPolicyManager) public {
        vm.assume(newPolicyManager != address(0));
        
        // Non-admin cannot update
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", attacker));
        oracleConsumer.setPolicyManager(newPolicyManager);
        
        // Admin can update
        vm.prank(admin);
        oracleConsumer.setPolicyManager(newPolicyManager);
        
        assertEq(oracleConsumer.policyManager(), newPolicyManager, "Policy manager should be updated");
    }

    /**
     * Additional test: Request ID generation is unique
     */
    function test_RequestIdGenerationIsUnique() public {
        string memory location = "New York";
        OracleConsumer.WeatherParameter weatherParam = OracleConsumer.WeatherParameter.TEMPERATURE;
        
        // Create multiple requests
        vm.prank(user);
        bytes32 requestId1 = oracleConsumer.requestWeatherData(location, weatherParam);
        
        vm.prank(user);
        bytes32 requestId2 = oracleConsumer.requestWeatherData(location, weatherParam);
        
        vm.prank(user);
        bytes32 requestId3 = oracleConsumer.requestWeatherData(location, weatherParam);
        
        // All request IDs should be unique
        assertTrue(requestId1 != requestId2, "Request IDs should be unique");
        assertTrue(requestId2 != requestId3, "Request IDs should be unique");
        assertTrue(requestId1 != requestId3, "Request IDs should be unique");
    }

    /**
     * Additional test: Cannot fulfill already fulfilled request
     */
    function test_CannotFulfillAlreadyFulfilledRequest() public {
        string memory location = "New York";
        OracleConsumer.WeatherParameter weatherParam = OracleConsumer.WeatherParameter.TEMPERATURE;
        
        // Create request
        vm.prank(user);
        bytes32 requestId = oracleConsumer.requestWeatherData(location, weatherParam);
        
        // Mock PolicyManager
        vm.mockCall(
            policyManager,
            abi.encodeWithSignature(
                "evaluatePolicies(string,uint8,int256,uint256)",
                location,
                uint8(weatherParam),
                int256(25),
                block.timestamp
            ),
            abi.encode(true)
        );
        
        // Fulfill request
        vm.prank(oracle);
        oracleConsumer.fulfillWeatherData(
            requestId,
            location,
            weatherParam,
            25,
            block.timestamp
        );
        
        // Try to fulfill again - should revert with RequestNotPending since it's no longer pending
        vm.prank(oracle);
        vm.expectRevert(OracleConsumer.RequestNotPending.selector);
        oracleConsumer.fulfillWeatherData(
            requestId,
            location,
            weatherParam,
            25,
            block.timestamp
        );
    }

    /**
     * Additional test: Cannot fulfill non-existent request
     */
    function test_CannotFulfillNonExistentRequest() public {
        bytes32 fakeRequestId = keccak256("fake");
        
        vm.prank(oracle);
        vm.expectRevert(OracleConsumer.RequestNotPending.selector);
        oracleConsumer.fulfillWeatherData(
            fakeRequestId,
            "New York",
            OracleConsumer.WeatherParameter.TEMPERATURE,
            25,
            block.timestamp
        );
    }

    /**
     * Additional test: Events are emitted correctly
     */
    function test_EventsEmittedCorrectly() public {
        string memory location = "New York";
        OracleConsumer.WeatherParameter weatherParam = OracleConsumer.WeatherParameter.TEMPERATURE;
        int256 value = 25;
        
        // Test WeatherDataRequested event - we check the event was emitted
        vm.prank(user);
        vm.recordLogs();
        bytes32 requestId = oracleConsumer.requestWeatherData(location, weatherParam);
        
        // Verify event was emitted
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 1, "Should emit one event");
        assertEq(entries[0].topics[0], keccak256("WeatherDataRequested(bytes32,address,string,uint8,uint256)"));
        
        // Mock PolicyManager
        vm.mockCall(
            policyManager,
            abi.encodeWithSignature(
                "evaluatePolicies(string,uint8,int256,uint256)",
                location,
                uint8(weatherParam),
                value,
                block.timestamp
            ),
            abi.encode(true)
        );
        
        // Test WeatherDataFulfilled event
        vm.prank(oracle);
        vm.expectEmit(true, false, false, true);
        emit OracleConsumer.WeatherDataFulfilled(
            requestId,
            location,
            weatherParam,
            value,
            block.timestamp
        );
        oracleConsumer.fulfillWeatherData(
            requestId,
            location,
            weatherParam,
            value,
            block.timestamp
        );
    }
}

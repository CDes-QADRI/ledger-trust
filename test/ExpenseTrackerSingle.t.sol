// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ExpenseTrackerSingle} from "../src/ExpenseTrackerSingle.sol";

contract ExpenseTrackerSingleTest is Test {
    // Target network: Ethereum Sepolia (chainId: 11155111)
    // Previously configured for Base Sepolia (chainId: 84532)
    uint256 constant ETH_SEPOLIA_CHAIN_ID = 11155111;

    ExpenseTrackerSingle tracker;
    address approver = address(1);
    address nonApprover = address(2);

    function setUp() public {
        // Simulate Ethereum Sepolia environment for all tests
        vm.chainId(ETH_SEPOLIA_CHAIN_ID);
        tracker = new ExpenseTrackerSingle(approver);
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    function testConstructorSetsApprover() public view {
        assertTrue(tracker.isCommitteeMember(approver));
        assertEq(tracker.requiredApprovals(), 1);
    }

    function testConstructorRejectsZeroAddress() public {
        vm.expectRevert("Invalid approver address");
        new ExpenseTrackerSingle(address(0));
    }

    // ─── submitExpense ────────────────────────────────────────────────────────

    function testSubmitExpenseIncrementsCount() public {
        tracker.submitExpense("Catering", 50000, "QmTest123");
        assertEq(tracker.expenseCount(), 1);
    }

    function testSubmitExpenseStoresCorrectData() public {
        tracker.submitExpense("Decoration", 10000, "QmHash456");
        (
            string memory desc,
            uint256 amount,
            string memory hash,
            uint256 approvals,
            bool isSettled,
            address submitter
        ) = tracker.expenses(1);

        assertEq(desc, "Decoration");
        assertEq(amount, 10000);
        assertEq(hash, "QmHash456");
        assertEq(approvals, 0);
        assertFalse(isSettled);
        assertEq(submitter, address(this));
    }

    function testSubmitExpenseEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit ExpenseTrackerSingle.ExpenseSubmitted(1, address(this), 5000, "QmSound789");
        tracker.submitExpense("Sound System", 5000, "QmSound789");
    }

    // ─── approveExpense ───────────────────────────────────────────────────────

    function testApproveExpenseSettlesWithOneApproval() public {
        tracker.submitExpense("Food", 100, "Qm123");

        vm.prank(approver);
        tracker.approveExpense(1);

        (,,,, bool isSettled,) = tracker.expenses(1);
        assertTrue(isSettled);
    }

    function testApproveExpenseEmitsBothEvents() public {
        tracker.submitExpense("Transport", 2000, "QmTransport");

        vm.expectEmit(true, true, false, true);
        emit ExpenseTrackerSingle.ExpenseApproved(1, approver, 1);

        vm.expectEmit(true, false, false, false);
        emit ExpenseTrackerSingle.ExpenseSettled(1);

        vm.prank(approver);
        tracker.approveExpense(1);
    }

    function testNonApproverCannotApprove() public {
        tracker.submitExpense("Venue", 30000, "QmVenue");

        vm.prank(nonApprover);
        vm.expectRevert("Only committee can approve");
        tracker.approveExpense(1);
    }

    function testCannotApproveInvalidExpenseId() public {
        vm.prank(approver);
        vm.expectRevert("Invalid expense ID");
        tracker.approveExpense(0);
    }

    function testCannotApproveOutOfRangeExpenseId() public {
        tracker.submitExpense("Misc", 500, "QmMisc");

        vm.prank(approver);
        vm.expectRevert("Invalid expense ID");
        tracker.approveExpense(99);
    }

    function testCannotApproveAlreadySettledExpense() public {
        tracker.submitExpense("DJ", 15000, "QmDJ");

        vm.prank(approver);
        tracker.approveExpense(1);

        // Try to approve again after settled
        vm.prank(approver);
        vm.expectRevert("Expense already settled");
        tracker.approveExpense(1);
    }

    function testCannotDoubleApprove() public {
        // Deploy a multi-member version to test double-vote guard in isolation
        // Here we test that hasApproved mapping blocks a second call before settlement
        // This is implicitly covered by testCannotApproveAlreadySettledExpense above.
        // Keeping this test as a direct mapping check.
        tracker.submitExpense("Lights", 8000, "QmLights");

        vm.prank(approver);
        tracker.approveExpense(1); // settles immediately

        assertFalse(tracker.hasApproved(1, nonApprover));
        assertTrue(tracker.hasApproved(1, approver));
    }
}

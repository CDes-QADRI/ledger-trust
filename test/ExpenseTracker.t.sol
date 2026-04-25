// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ExpenseTracker} from "../src/ExpenseTracker.sol";

contract ExpenseTrackerTest is Test {
    ExpenseTracker tracker;
    address owner;
    address committee1 = address(1);
    address committee2 = address(2);
    address committee3 = address(3);
    address nonCommittee = address(99);
    address submitter = address(100);

    function setUp() public {
        owner = address(this); // test contract is owner
        address[] memory committee = new address[](3);
        committee[0] = committee1;
        committee[1] = committee2;
        committee[2] = committee3;
        tracker = new ExpenseTracker(committee, 2); // require 2 of 3 approvals
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    function testConstructorSetsCommittee() public view {
        assertTrue(tracker.isCommitteeMember(committee1));
        assertTrue(tracker.isCommitteeMember(committee2));
        assertTrue(tracker.isCommitteeMember(committee3));
        assertFalse(tracker.isCommitteeMember(nonCommittee));
    }

    function testConstructorSetsRequiredApprovals() public view {
        assertEq(tracker.requiredApprovals(), 2);
    }

    function testConstructorSetsOwner() public view {
        assertEq(tracker.owner(), address(this));
    }

    function testConstructorRevertsEmptyCommittee() public {
        address[] memory empty;
        vm.expectRevert("Committee required");
        new ExpenseTracker(empty, 1);
    }

    function testConstructorRevertsZeroRequiredApprovals() public {
        address[] memory c = new address[](1);
        c[0] = committee1;
        vm.expectRevert("Required approvals must be > 0");
        new ExpenseTracker(c, 0);
    }

    function testConstructorRevertsRequiredApprovalsExceedCommittee() public {
        address[] memory c = new address[](1);
        c[0] = committee1;
        vm.expectRevert("Required approvals exceed committee size");
        new ExpenseTracker(c, 2);
    }

    function testConstructorRevertsZeroAddressMember() public {
        address[] memory c = new address[](2);
        c[0] = committee1;
        c[1] = address(0);
        vm.expectRevert("Invalid address");
        new ExpenseTracker(c, 1);
    }

    function testConstructorRevertsDuplicateMember() public {
        address[] memory c = new address[](2);
        c[0] = committee1;
        c[1] = committee1;
        vm.expectRevert("Already a member");
        new ExpenseTracker(c, 1);
    }

    // ─── submitExpense ───────────────────────────────────────────────────────

    function testSubmitExpenseIncrementsCount() public {
        vm.prank(submitter);
        tracker.submitExpense("Food", 100, "Qm123");
        assertEq(tracker.expenseCount(), 1);
    }

    function testSubmitExpenseStoresCorrectData() public {
        vm.prank(submitter);
        tracker.submitExpense("Catering", 50000, "QmHash456");

        (string memory desc, uint256 amount, string memory hash, uint256 approvals, bool settled, address sub) =
            tracker.expenses(1);

        assertEq(desc, "Catering");
        assertEq(amount, 50000);
        assertEq(hash, "QmHash456");
        assertEq(approvals, 0);
        assertFalse(settled);
        assertEq(sub, submitter);
    }

    function testSubmitExpenseEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit ExpenseTracker.ExpenseSubmitted(1, submitter, 100, "Qm123");
        vm.prank(submitter);
        tracker.submitExpense("Food", 100, "Qm123");
    }

    function testSubmitRevertsEmptyDescription() public {
        vm.expectRevert("Description cannot be empty");
        tracker.submitExpense("", 100, "Qm123");
    }

    function testSubmitRevertsZeroAmount() public {
        vm.expectRevert("Amount must be greater than 0");
        tracker.submitExpense("Food", 0, "Qm123");
    }

    function testSubmitRevertsEmptyHash() public {
        vm.expectRevert("Receipt hash required");
        tracker.submitExpense("Food", 100, "");
    }

    // ─── approveExpense ───────────────────────────────────────────────────────

    function testSingleApprovalDoesNotSettleWhenRequiredIsTwo() public {
        vm.prank(submitter);
        tracker.submitExpense("Venue", 30000, "QmVenue");

        vm.prank(committee1);
        tracker.approveExpense(1);

        (,,,, bool settled,) = tracker.expenses(1);
        assertFalse(settled);
    }

    function testSecondApprovalSettlesExpense() public {
        vm.prank(submitter);
        tracker.submitExpense("Venue", 30000, "QmVenue");

        vm.prank(committee1);
        tracker.approveExpense(1);

        vm.prank(committee2);
        tracker.approveExpense(1);

        (,,,, bool settled,) = tracker.expenses(1);
        assertTrue(settled);
        assertEq(tracker.hasApproved(1, committee1), true);
        assertEq(tracker.hasApproved(1, committee2), true);
    }

    function testApproveExpenseEmitsBothEvents() public {
        vm.prank(submitter);
        tracker.submitExpense("Transport", 2000, "QmTransport");

        // First approval: only ExpenseApproved
        vm.prank(committee1);
        vm.expectEmit(true, true, false, true);
        emit ExpenseTracker.ExpenseApproved(1, committee1, 1);
        tracker.approveExpense(1);

        // Second approval: ExpenseApproved + ExpenseSettled
        vm.expectEmit(true, true, false, true);
        emit ExpenseTracker.ExpenseApproved(1, committee2, 2);
        vm.expectEmit(true, false, false, false);
        emit ExpenseTracker.ExpenseSettled(1);
        vm.prank(committee2);
        tracker.approveExpense(1);
    }

    function testNonCommitteeCannotApprove() public {
        vm.prank(submitter);
        tracker.submitExpense("Misc", 500, "QmMisc");

        vm.prank(nonCommittee);
        vm.expectRevert("Only committee can approve");
        tracker.approveExpense(1);
    }

    function testCannotApproveInvalidId() public {
        vm.prank(committee1);
        vm.expectRevert("Invalid expense ID");
        tracker.approveExpense(0);
    }

    function testCannotApproveOutOfRangeId() public {
        vm.prank(submitter);
        tracker.submitExpense("Item", 100, "QmItem");

        vm.prank(committee1);
        vm.expectRevert("Invalid expense ID");
        tracker.approveExpense(99);
    }

    function testCannotDoubleApprove() public {
        vm.prank(submitter);
        tracker.submitExpense("Lights", 8000, "QmLights");

        vm.prank(committee1);
        tracker.approveExpense(1);

        vm.prank(committee1);
        vm.expectRevert("Already approved");
        tracker.approveExpense(1);
    }

    function testCannotApproveAlreadySettled() public {
        vm.prank(submitter);
        tracker.submitExpense("DJ", 15000, "QmDJ");

        vm.prank(committee1);
        tracker.approveExpense(1);

        vm.prank(committee2);
        tracker.approveExpense(1); // settles

        vm.prank(committee3);
        vm.expectRevert("Expense already settled");
        tracker.approveExpense(1);
    }

    // ─── Committee Management ────────────────────────────────────────────────

    function testOwnerCanAddCommitteeMember() public {
        tracker.addCommitteeMember(nonCommittee);
        assertTrue(tracker.isCommitteeMember(nonCommittee));
    }

    function testAddCommitteeMemberEmitsEvent() public {
        vm.expectEmit(true, false, false, false);
        emit ExpenseTracker.CommitteeMemberAdded(nonCommittee);
        tracker.addCommitteeMember(nonCommittee);
    }

    function testNonOwnerCannotAddMember() public {
        vm.prank(committee1);
        vm.expectRevert("Only owner can call");
        tracker.addCommitteeMember(address(4));
    }

    function testCannotAddDuplicateMember() public {
        vm.expectRevert("Already a member");
        tracker.addCommitteeMember(committee1);
    }

    function testCannotAddZeroAddress() public {
        vm.expectRevert("Invalid address");
        tracker.addCommitteeMember(address(0));
    }

    function testOwnerCanRemoveMember() public {
        tracker.removeCommitteeMember(committee1);
        assertFalse(tracker.isCommitteeMember(committee1));
    }

    function testRemoveMemberEmitsEvent() public {
        vm.expectEmit(true, false, false, false);
        emit ExpenseTracker.CommitteeMemberRemoved(committee1);
        tracker.removeCommitteeMember(committee1);
    }

    function testCannotRemoveOwner() public {
        // Owner is not part of the committee by default
        tracker.addCommitteeMember(owner); // make owner a member
        vm.expectRevert("Cannot remove owner from committee");
        tracker.removeCommitteeMember(owner);
    }

    function testOwnerCanSetRequiredApprovals() public {
        tracker.setRequiredApprovals(3);
        assertEq(tracker.requiredApprovals(), 3);
    }

    function testCannotSetRequiredApprovalsAboveCommitteeSize() public {
        vm.expectRevert("Invalid required approvals");
        tracker.setRequiredApprovals(99);
    }

    function testCannotSetRequiredApprovalsToZero() public {
        vm.expectRevert("Invalid required approvals");
        tracker.setRequiredApprovals(0);
    }

    function testGetCommitteeMembers() public view {
        address[] memory members = tracker.getCommitteeMembers();
        assertEq(members.length, 3);
        assertEq(members[0], committee1);
        assertEq(members[1], committee2);
        assertEq(members[2], committee3);
    }

    // ─── Fuzz / Property-Based Tests ────────────────────────────────────────

    function testFuzz_submitExpense(string memory desc, uint256 amt) public {
        vm.assume(bytes(desc).length > 0);
        vm.assume(amt > 0 && amt <= 1e30); // avoid gas overflow

        vm.prank(submitter);
        tracker.submitExpense(desc, amt, "QmFuzz");

        (string memory d, uint256 a,,,,) = tracker.expenses(1);
        assertEq(d, desc);
        assertEq(a, amt);
    }

    function testFuzz_approvalFlow(uint8 approvalsNeeded) public {
        // Deploy a contract with approvalsNeeded (1-5)
        vm.assume(approvalsNeeded >= 1 && approvalsNeeded <= 5);

        address[] memory members = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            members[i] = address(uint160(100 + i));
        }

        ExpenseTracker t = new ExpenseTracker(members, approvalsNeeded);

        vm.prank(submitter);
        t.submitExpense("Fuzz", 100, "QmFuzz");

        // Approve approvalsNeeded times
        for (uint256 i = 0; i < approvalsNeeded; i++) {
            vm.prank(members[i]);
            t.approveExpense(1);
        }

        (,,,, bool settled,) = t.expenses(1);
        assertTrue(settled);
    }
}

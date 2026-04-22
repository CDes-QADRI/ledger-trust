// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ExpenseTracker} from "../src/ExpenseTracker.sol";

contract ExpenseTrackerTest is Test {
    ExpenseTracker tracker;
    address committee1 = address(1);

    function setUp() public {
        address[] memory committee = new address[](1);
        committee[0] = committee1;
        tracker = new ExpenseTracker(committee, 1);
    }

    function testSubmitAndApprove() public {
        tracker.submitExpense("Food", 100, "Qm123");
        
        vm.prank(committee1);
        tracker.approveExpense(1);
        
        (,,,, bool isSettled,) = tracker.expenses(1);
        assertTrue(isSettled);
    }
}
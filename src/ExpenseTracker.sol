// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ExpenseTracker {
    struct Expense {
        string description;
        uint256 amount;
        string ipfsReceiptHash;
        uint256 approvals;
        bool isSettled;
        address submitter;
    }

    mapping(uint256 => Expense) public expenses;
    uint256 public expenseCount;

    mapping(address => bool) public isCommitteeMember;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    uint256 public requiredApprovals;

    constructor(address[] memory _committee, uint256 _requiredApprovals) {
        require(_committee.length > 0, "Committee required");
        require(_requiredApprovals > 0, "Required approvals must be > 0");
        require(_requiredApprovals <= _committee.length, "Invalid required approvals");

        for (uint256 i = 0; i < _committee.length; i++) {
            require(_committee[i] != address(0), "Invalid committee member");
            require(!isCommitteeMember[_committee[i]], "Duplicate committee member");
            isCommitteeMember[_committee[i]] = true;
        }
        requiredApprovals = _requiredApprovals;
    }

    function submitExpense(string memory _description, uint256 _amount, string memory _ipfsReceiptHash) public {
        expenseCount++;
        expenses[expenseCount] = Expense({
            description: _description,
            amount: _amount,
            ipfsReceiptHash: _ipfsReceiptHash,
            approvals: 0,
            isSettled: false,
            submitter: msg.sender
        });
    }

    function approveExpense(uint256 _expenseId) public {
        require(isCommitteeMember[msg.sender] == true, "Only committee can approve");
        require(_expenseId > 0 && _expenseId <= expenseCount, "Invalid expense ID");

        Expense storage expense = expenses[_expenseId];
        require(expense.isSettled == false, "Expense already settled");
        require(hasApproved[_expenseId][msg.sender] == false, "You already approved this");

        hasApproved[_expenseId][msg.sender] = true;
        expense.approvals++;

        if (expense.approvals >= requiredApprovals) {
            expense.isSettled = true;
        }
    }
}

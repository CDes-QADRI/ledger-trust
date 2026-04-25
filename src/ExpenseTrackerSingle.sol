// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ExpenseTrackerSingle
/// @notice Single-approver version of ExpenseTracker used for development and testing.
///         Target network: Ethereum Sepolia testnet (chainId: 11155111).
///         Deploy this when you only have one wallet address available.
///         Identical function signatures and events — fully ABI-compatible with the
///         multi-member contract so the frontend does NOT need any changes.
///         When the real committee is formed, deploy ExpenseTracker.sol instead.
contract ExpenseTrackerSingle {
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

    event ExpenseSubmitted(uint256 indexed expenseId, address indexed submitter, uint256 amount);
    event ExpenseApproved(uint256 indexed expenseId, address indexed approver, uint256 approvals);
    event ExpenseSettled(uint256 indexed expenseId);

    /// @param _approver The single wallet address that has approval rights (your own wallet for testing).
    constructor(address _approver) {
        require(_approver != address(0), "Invalid approver address");
        isCommitteeMember[_approver] = true;
        requiredApprovals = 1;
    }

    function submitExpense(string memory _description, uint256 _amount, string memory _ipfsReceiptHash) public {
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_amount > 0, "Amount must be greater than 0");
        expenseCount++;
        expenses[expenseCount] = Expense({
            description: _description,
            amount: _amount,
            ipfsReceiptHash: _ipfsReceiptHash,
            approvals: 0,
            isSettled: false,
            submitter: msg.sender
        });
        emit ExpenseSubmitted(expenseCount, msg.sender, _amount);
    }

    function approveExpense(uint256 _expenseId) public {
        require(isCommitteeMember[msg.sender] == true, "Only committee can approve");
        require(_expenseId > 0 && _expenseId <= expenseCount, "Invalid expense ID");

        Expense storage expense = expenses[_expenseId];
        require(expense.isSettled == false, "Expense already settled");
        require(hasApproved[_expenseId][msg.sender] == false, "You already approved this");

        hasApproved[_expenseId][msg.sender] = true;
        expense.approvals++;
        emit ExpenseApproved(_expenseId, msg.sender, expense.approvals);

        if (expense.approvals >= requiredApprovals) {
            expense.isSettled = true;
            emit ExpenseSettled(_expenseId);
        }
    }
}

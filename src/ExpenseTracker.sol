// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ExpenseTracker
/// @notice Multi-committee-member expense tracking with multi-sig-style approval flow.
/// @dev Security features: input validation, CEI pattern, event emission for all state changes.
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
    address[] public committeeMembers;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    uint256 public requiredApprovals;

    address public immutable owner;

    event ExpenseSubmitted(
        uint256 indexed expenseId, address indexed submitter, uint256 amount, string ipfsReceiptHash
    );
    event ExpenseApproved(uint256 indexed expenseId, address indexed approver, uint256 approvals);
    event ExpenseSettled(uint256 indexed expenseId);
    event CommitteeMemberAdded(address indexed member);
    event CommitteeMemberRemoved(address indexed member);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    modifier onlyCommittee() {
        require(isCommitteeMember[msg.sender], "Only committee can approve");
        _;
    }

    constructor(address[] memory _committee, uint256 _requiredApprovals) {
        require(_committee.length > 0, "Committee required");
        require(_requiredApprovals > 0, "Required approvals must be > 0");
        require(_requiredApprovals <= _committee.length, "Required approvals exceed committee size");

        owner = msg.sender;

        for (uint256 i = 0; i < _committee.length; i++) {
            _addCommitteeMember(_committee[i]);
        }
        requiredApprovals = _requiredApprovals;
    }

    /// @notice Submit a new expense. Open to anyone.
    function submitExpense(string memory _description, uint256 _amount, string memory _ipfsReceiptHash) public {
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_ipfsReceiptHash).length > 0, "Receipt hash required");

        expenseCount++;
        expenses[expenseCount] = Expense({
            description: _description,
            amount: _amount,
            ipfsReceiptHash: _ipfsReceiptHash,
            approvals: 0,
            isSettled: false,
            submitter: msg.sender
        });

        emit ExpenseSubmitted(expenseCount, msg.sender, _amount, _ipfsReceiptHash);
    }

    /// @notice Approve an expense. Only committee members can call.
    /// @dev Uses Checks-Effects-Interactions pattern to prevent reentrancy.
    function approveExpense(uint256 _expenseId) public onlyCommittee {
        require(_expenseId > 0 && _expenseId <= expenseCount, "Invalid expense ID");

        Expense storage expense = expenses[_expenseId];
        require(!expense.isSettled, "Expense already settled");
        require(!hasApproved[_expenseId][msg.sender], "Already approved");

        // Effects
        hasApproved[_expenseId][msg.sender] = true;
        expense.approvals++;

        emit ExpenseApproved(_expenseId, msg.sender, expense.approvals);

        // Check if required approvals met
        if (expense.approvals >= requiredApprovals) {
            expense.isSettled = true;
            emit ExpenseSettled(_expenseId);
        }
    }

    /// @notice Add a committee member (owner only).
    function addCommitteeMember(address _member) public onlyOwner {
        require(_member != address(0), "Invalid address");
        require(!isCommitteeMember[_member], "Already a member");
        _addCommitteeMember(_member);
    }

    /// @notice Remove a committee member (owner only).
    function removeCommitteeMember(address _member) public onlyOwner {
        require(isCommitteeMember[_member], "Not a member");
        require(_member != owner, "Cannot remove owner from committee");
        isCommitteeMember[_member] = false;
        emit CommitteeMemberRemoved(_member);
    }

    /// @notice Update required approval count (owner only).
    /// @dev Must be between 1 and current committee size.
    function setRequiredApprovals(uint256 _required) public onlyOwner {
        require(_required > 0 && _required <= committeeMembers.length, "Invalid required approvals");
        requiredApprovals = _required;
    }

    /// @notice Get full committee member list.
    function getCommitteeMembers() public view returns (address[] memory) {
        return committeeMembers;
    }

    /// @notice Internal helper to add a committee member.
    function _addCommitteeMember(address _member) internal {
        require(_member != address(0), "Invalid address");
        require(!isCommitteeMember[_member], "Already a member");
        isCommitteeMember[_member] = true;
        committeeMembers.push(_member);
        emit CommitteeMemberAdded(_member);
    }
}

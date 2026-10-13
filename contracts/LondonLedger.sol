// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Public receipt for London Life's money ledger. The game database stays the source of truth;
/// the operator mirrors each ledger row here once, keyed by its row id.
contract LondonLedger {
    address public immutable operator;
    mapping(bytes32 => int256) public balancePence; // per sim
    mapping(uint256 => bool) public settled; // ledger row id → done

    event Settled(bytes32 indexed sim, uint256 indexed txId, int256 amountPence, int256 balanceAfter, bytes32 kind);

    constructor() {
        operator = msg.sender;
    }

    function settleBatch(
        bytes32[] calldata sims,
        int256[] calldata amounts,
        bytes32[] calldata kinds,
        uint256[] calldata txIds
    ) external {
        require(msg.sender == operator, "operator only");
        require(
            sims.length == amounts.length && amounts.length == kinds.length && kinds.length == txIds.length,
            "length"
        );
        for (uint256 i; i < sims.length; ++i) {
            if (settled[txIds[i]]) continue;
            settled[txIds[i]] = true;
            int256 b = balancePence[sims[i]] + amounts[i];
            balancePence[sims[i]] = b;
            emit Settled(sims[i], txIds[i], amounts[i], b, kinds[i]);
        }
    }
}

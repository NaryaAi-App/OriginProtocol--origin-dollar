// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PropertiesOUSDTransferable.sol";

contract TestOUSDTransferable is PropertiesOUSDTransferable {
    constructor() {
        // Existing addresses:
        // - crytic_owner: If the contract has an owner, it must be crytic_owner
        // - crytic_user: Legitimate user
        // - crytic_attacker: Attacker
        //
        // Add below a minimal configuration:
        // - crytic_owner must have some tokens
        // - crytic_user must have some tokens
        // - crytic_attacker must have some tokens

        // rebasingCredits = 0; // Already set by parent
        // rebasingCreditsPerToken = 1e27;  // Already set by parent
        vaultAddress = crytic_owner;
        // nonRebasingSupply = 0;  // Already set by parent

        initialTotalSupply = ~uint128(0);
        initialBalance_owner = initialTotalSupply / 3;
        _mint(crytic_owner, initialBalance_owner);
        initialBalance_user = initialTotalSupply / 3;
        _mint(crytic_user, initialBalance_user);
        initialBalance_attacker = initialTotalSupply / 3;
        _mint(crytic_attacker, initialBalance_attacker);
    }
}

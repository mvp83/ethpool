//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ETHPool.sol";

contract HelperForTestReentrancy {
    
    ETHPool private ethPool;
    bool private inReentracy;

    constructor (address payable ethPoolContract) {
        ethPool = ETHPool(ethPoolContract);
    }

    function makeDeposit() external payable {
        ethPool.makeDeposit{value: msg.value}();
    }

    function withdrawDepositAndRewards() external {
        ethPool.withdrawDepositAndRewards();
    }

    receive() external  payable  {
        if (!inReentracy) {
            inReentracy = true;
            ethPool.withdrawDepositAndRewards();
        }
    }
}
//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ETHPool.sol";

contract HelperForTest {
    
    ETHPool private ethPool;

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
        revert("forbidden");
    }

}
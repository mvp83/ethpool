# Smart Contract Challenge

## A) Challenge

### 1) Setup a project and create a contract

#### Summary

ETHPool provides a service where people can deposit ETH and they will receive weekly rewards. Users must be able to take out their deposits along with their portion of rewards at any time. New rewards are deposited manually into the pool by the ETHPool team each week using a contract function.

#### Requirements

- Only the team can deposit rewards.
- Deposited rewards go to the pool of users, not to individual users.
- Users should be able to withdraw their deposits along with their share of rewards considering the time when they deposited.

Example:

> Let say we have user **A** and **B** and team **T**.
>
> **A** deposits 100, and **B** deposits 300 for a total of 400 in the pool. Now **A** has 25% of the pool and **B** has 75%. When **T** deposits 200 rewards, **A** should be able to withdraw 150 and **B** 450.
>
> What if the following happens? **A** deposits then **T** deposits then **B** deposits then **A** withdraws and finally **B** withdraws.
> **A** should get their deposit + all the rewards.
> **B** should only get their deposit because rewards were sent to the pool before they participated.

#### Goal

Design and code a contract for ETHPool, take all the assumptions you need to move forward.

You can use any development tools you prefer: Hardhat, Truffle, Brownie, Solidity, Vyper.

Useful resources:

- Solidity Docs: https://docs.soliditylang.org/en/v0.8.4
- Educational Resource: https://github.com/austintgriffith/scaffold-eth
- Project Starter: https://github.com/abarmat/solidity-starter

### 2) Write tests

Make sure that all your code is tested properly

### 3) Deploy your contract

Deploy the contract to any Ethereum testnet of your preference. Keep record of the deployed address.

Bonus:

- Verify the contract in Etherscan

### 4) Interact with the contract

Create a script (or a Hardhat task) to query the total amount of ETH held in the contract.

_You can use any library you prefer: Ethers.js, Web3.js, Web3.py, eth-brownie_


# Solution

https://ropsten.etherscan.io/address/0x672b4c5c4bc858625400c3f953017fe5abb9ae46#code

This task becomes simple if we imagine that each user buys shares and so, rewards are dividends. It means, when a user interacts with ETHPool and calls makeDeposit(), ETHPool saves count of shares (=ethers/share_price) instead of ethers. When the team makes a reward, the price of the share changes proportionally as reward/total_users_deposit. Count of share doesn't change, only price. From this moment the user's part of reward (we can say) is reinvested. 

User can call withdrawDepositAndRewards() and get his deposit + reward.
 
When a new user (or old) makes makeDeposit() - he buys shares by actual price.

This approach allows don't think about time and don't use arrays of deposit and time when deposit happens (+arrays of rewards). (Arrays are very bad for solidity when using loop operators - if our dApp will be successful, the count of users can reach huge amounts and smart-contract functions will need more gas than one block can propose. But this task can be solved by doing things by parts. However, why do we need to complicate it if there exists a better and simpler solution.)

## Nuances

Requirement "Only the team can deposit rewards" can be done if smart-contract saves the sum of ethers sent by users and the team. But in this case, ethers which were sent directly to smart-contract or smart-contract address which was selfdestruct parameter or in miner coinbase address - these ethers will be saved on smart-contract addresses and do nothing until the team decides to destroy the contract. Current solution allows to send ethers directly on the contract address only by team (reverted to others, except selfdestroy and miner's coinbase). As a result we have an interesting side effect - this amount of ethers can count as minimal guarantee reward - it will be distributed when the team call teamMakesReward() next time, but until next time doesn't happen,  users can see reward and maybe more actively makeDeposit().

Requirement "Users should be able to withdraw their deposits along with their share of rewards considering the time when they deposited" was done by one method withdrawDepositAndRewards(). It is possible to make a method for partial withdrawal (as the contract saves the user's shares count), but, in general, users can call makeDeposit again with desired amount.

In process "New rewards are deposited manually into the pool by the ETHPool team each week using a contract function" mention "each week" was ignored because our solution is time-independent and there no sense to restrict teamMakesReward() at once per week.

Changing of team was realized through 2-steps procedure:
   at the 1st step old team suppose new team;
   at the 2nd step new team admit that they ready to be the Team
Such a way was chosen because if a team makes a mistake in the address of a new team - control over the contract will be lost forever. This simple 2-steps procedure insures from typo or miscoping
  
## Project structure

contracts/EHTPool.sol - our solution;
contracts/HelperForTest.sol - proxy smart-contract which helps with test case when users can't withdraw balance and rewards;
contracts/HelperForTestReentrancy - proxy contract which helps with test cases when attackers try to make reentrancy on withdrawDepositAndRewards() method.

scripts/deploys.ts - deploy script

test/index.ts - test cases

hardhat.config.ts - hardhat config (enable solidity optimization) + task "balance" (get balance as address balance) + task "balance_with_methods" (current balance which were deposited via makeDeposit and teamMakesReward - as we remember,  the contract can get some ether as coinbase address or as parameter of selfdestruct or the team can send some ethers directly on address - such ethers will be counted after next call of teamMakesReward)
.env - etherscan API's key, ropsten node url, priv key, etc. - you should set up your values for every field!

## Testing

### Coverage report:

------------------------------|----------|----------|----------|----------|----------------|
File                          |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
------------------------------|----------|----------|----------|----------|----------------|
 contracts/                   |      100 |       95 |      100 |      100 |                |
  ETHPool.sol                 |      100 |      100 |      100 |      100 |                |
  HelperForTest.sol           |      100 |      100 |      100 |      100 |                |
  HelperForTestReentrancy.sol |      100 |       50 |      100 |      100 |                |
------------------------------|----------|----------|----------|----------|----------------|
All files                     |      100 |       95 |      100 |      100 |                |
------------------------------|----------|----------|----------|----------|----------------|

### About test

Tests are organized by each method + some general section. There are no comments except describing - test pretty simple and obvious for understanding. Every method and code branch of ETHPool were tested. 32 tests were written (but can be written much more, especially with purpose to find max limits for deposit and what happens if users deposit amount which are significant different - in more than 1_000_000_000 for instance)

#### Some interesting test-cases: 

_teamMakesReward method_ -> _Should set correct sharePrice if some ether was sent without ETHPool method_
_withdrawDepositAndRewards method_ -> _Should failed because send failed and emit UnsuccessfulWithdraw_ 
_withdrawDepositAndRewards method_ -> _Shouldn't allow to withdraw more if case of reentrancy_
_some general use cases_ -> whole section


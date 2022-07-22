//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./Template/Istanbul10/Interface/IRouterData.sol";
import "./Interface/IDivision.sol";
import "./Interface/IWETH.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";


contract Division is ERC20Upgradeable , IDivision {
    IRouterData public routerContract;  
   

    function initialize(string memory name_,string memory symbol_) external {
        __ERC20_init(name_, symbol_);
        routerContract = IRouterData(msg.sender);
    }
    
    
    modifier checkSender() {
        require(routerContract.whiteList(msg.sender),"whiteList :: Address check error");
        _;
    }

    
    // ------------------------------    Division   ----------------------------------------
    function mintDivision(address account,uint256 amount) override external checkSender {
        if(account != address(0) && amount > 0){
            _mint(account,amount);
        }
    }

    function burnDivision(address account,uint256 amount) override external checkSender {
        if(account != address(0) && amount > 0){
            _burn(account,amount);
        }
    } 
  
 
}

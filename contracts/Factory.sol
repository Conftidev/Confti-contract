//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./utils/Pausable.sol";

import {InitializedProxy} from "./InitializedProxy.sol";

contract Factory is Ownable, Pausable {
  
  mapping(string => mapping(uint16 => address)) public updateUtilsAddres;

  /// @notice the number of ERC721 vaults router
  uint256 public vaultRouterCount;
  
  /// @notice the mapping of vault number to vault router contract
  mapping(uint256 => address) public routers; 

  // The router address given by the user mint returns which router template he originally used 
  mapping(address => address) public calibrationTemplate;

  /// @notice a setting contract controlled by governance
  address public immutable setting;
  
  /// @notice the TokenVault logic contract
  mapping (address => bool) public routerTemplateMap;

  mapping (address => address) public lastMint;

  bool private reentry;

  event Mint( address indexed router, address indexed template , uint256 vaultRouterCount);
  
  modifier nonReentrant() {
    require(!reentry,"reentry :: Illegal reentrant");
    reentry = true;
    _;
    reentry = false;
  }

  constructor(address setting_) {
    setting = setting_;
  } 

  function setUpdateUtilsAddres(string memory versionsName,uint16 versions,address updataTemplate) external onlyOwner{
    updateUtilsAddres[versionsName][versions] = updataTemplate;
  }

  function mint(address routerTemplate,string memory name) external whenNotPaused nonReentrant returns(uint256) {
    require(routerTemplateMap[routerTemplate], "Factory :: Incorrect template address");

    bytes memory _initializationCalldata = abi.encodeWithSignature(
      "initialize(address,address,string)",
      msg.sender,
      setting,
      name
    );

    address router = address(
      new InitializedProxy(
        routerTemplate,
        _initializationCalldata
      )
    );
    
    emit Mint( router, routerTemplate , vaultRouterCount);

    routers[vaultRouterCount] = router;
    lastMint[msg.sender] = router;
    calibrationTemplate[router] = routerTemplate;
    vaultRouterCount++;

    return vaultRouterCount - 1;
  }

  function setLogic(address router, bool ratify) external onlyOwner {
    routerTemplateMap[router] = ratify;
  }

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }

}

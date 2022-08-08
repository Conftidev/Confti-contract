//使用说明，在终端执行 npx hardhat test ./test/veToken-reward-test.js
//个人奖励单人测式角本
const { inputToConfig } = require("@ethereum-waffle/compiler");
const { expect, assert } = require("chai");
const { ethers,network,deployments} = require("hardhat");
const { provider } = waffle;
const { utils} = require("ethers");

 
const DELAY_WEEK = 604800; // 1 week
const gas ={
    gasPrice:1097302934,
    gasLimit:6000000
}
 
  
async function moveTime(amount) {
  console.log("Moving blocks increaseTime...")
  await hre.network.provider.send("evm_increaseTime",[amount])
  console.log(`Moved forward in time ${amount} seconds`)
}

async function moveBlock(amount) {
    console.log("Moving blocks...",amount)
    for (let index = 0; index < amount; index++) {
        await hre.network.provider.request({
          method: "evm_mine",
          params: [],
        })
    }
    console.log(`Moved ${amount} blocks`)
}

async function blockInfo(){
    console.log("区块号：",await provider.getBlockNumber());
    console.log("区块时间：",(await provider.getBlock()).timestamp);
    return (await provider.getBlock()).timestamp;
}

async function main() {
<<<<<<< Updated upstream
  const amount = 100000000000000000000; 
  const DELAY_WEEK = 604800; // 1 week
  // 质押
  let unLockedTime = Date.parse(new Date())/1000 + DELAY_WEEK * 4;
  
  const [deployer,deployer2] = await hre.ethers.getSigners();
  deployerAddress = deployer.address;
  console.log(deployerAddress)
 
  const VeToken = await hre.ethers.getContractFactory("VeToken");
  const veTokenContract = await VeToken.deploy();
  await veTokenContract.deployed();
  console.log("veTokenContract deployed to:", veTokenContract.address);

  const vote = await hre.ethers.getContractFactory("Vote");
  const voteContract = await  vote.deploy();
  await voteContract.deployed();
  console.log("VoteContract deployed to:", voteContract.address);

  const auction = await hre.ethers.getContractFactory("Auction");
  const auctionContract = await  auction.deploy();
  await auctionContract.deployed();
  console.log("auctionContract deployed to:", auctionContract.address);
  
  const vault = await hre.ethers.getContractFactory("Vault");
  const vaultContract = await  vault.deploy();
  await vaultContract.deployed();
  console.log("vaultContract deployed to:", vaultContract.address);

  const Settings = await hre.ethers.getContractFactory("Settings");
  const SettingsContract = await Settings.deploy();
  await SettingsContract.deployed();
  console.log("veTokenContract deployed to:", SettingsContract.address);

  const Factory = await hre.ethers.getContractFactory("Factory"); 
  const factoryContract = await  Factory.deploy(SettingsContract.address);
  await factoryContract.deployed();
  console.log("factoryContract deployed to:", factoryContract.address);

  const division = await hre.ethers.getContractFactory("Division"); 
  const divisionContract = await  division.deploy();
  await divisionContract.deployed();
  console.log("divisionContract deployed to:", divisionContract.address);

  const router = await hre.ethers.getContractFactory("Router"); 
  const routerContract = await router.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
  await routerContract.deployed();
  console.log("routerContract deployed to:", routerContract.address);

  await factoryContract.setLogic(routerContract.address,true,gas);
 
  let test =await factoryContract.mint(routerContract.address,"test",gas);
  await test.wait(1);

  const newRouterAddress = await factoryContract.routers(0)
  const newRouterContracy = await router.attach(newRouterAddress)
  console.log("newRouterAddress : ",newRouterAddress)
  
  //--------------------------------Vault------------------------------------
  const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
  const TestERC1155Contract = await  TestERC11555.deploy();

  await TestERC1155Contract.deployed();
 
  const mint1 = await TestERC1155Contract.mint(deployerAddress,1,10,gas)
  await mint1.wait(1);

  const mint2 = await TestERC1155Contract.mint(deployerAddress,2,10,gas)
  await mint2.wait(1);
  
  const mint3 = await TestERC1155Contract.mint(deployerAddress,3,10,gas)
  await mint3.wait(1);
 
 
  let newVaultAddress =  await newRouterContracy.vault();
  console.log("newVaultAddress : ",newVaultAddress);

   const setApprovalForAll= await TestERC1155Contract.setApprovalForAll(newVaultAddress,true,gas);
  await setApprovalForAll.wait(1);
  console.log("【aprove】");

 
  const deposit = await newRouterContracy.curatorDeposit(
    [TestERC1155Contract.address,TestERC1155Contract.address,TestERC1155Contract.address],
    [1,2,3],
    [10,10,10]
    ,gas);
    await deposit.wait(1);
  console.log("【curatorDeposit】");

  let tx  = await newRouterContracy.issue(utils.parseUnits("10000",18) ,"Tcoin",0,utils.parseUnits("1",18),6048000,6048000,gas)
  await tx.wait(1);
 
  //--------------------------------Vote------------------------------------
 
  //生成 token合约 (Division)
  const newDivisionAddress = await newRouterContracy.division();
  let token = await divisionContract.attach(newDivisionAddress);
  console.log("tokenAddress = ",token.address);
 
  const newVeTokenContractAddress = await newRouterContracy.veToken();
  newVeToken = await VeToken.attach(newVeTokenContractAddress);
 
  // token授权给veToken
  let approveTx = await token.approve(newVeToken.address,amount+"");
  let approveResult =  await approveTx.wait();
  console.log("授权成功！");
 
  let createLock = await newVeToken.createLock(amount+"",unLockedTime,gas);
  await createLock.wait(1);
  console.log("createLock");

  //移动1周后
  moveTime(DELAY_WEEK * 1);
  await moveBlock(1);
  console.log("移动1周后");
 
  const newVote = await newRouterContracy.vote();
  const newVoteContract = await vote.attach(newVote);

  const maxRewar = await newVoteContract.updateMaxRewardDuration(100000000,gas);
   await maxRewar.wait(1);
   console.log("updateMaxRewardDuration");
  const updateMaxPledgeDuration =await  newVoteContract.updateMaxPledgeDuration(1000000000,gas);
   
  // let createVote  = await newVoteContract.createVote("setVeTokenAmount","describeSet",1,30,gas);
  // await createVote.wait(1);
  // console.log("【createVote】");
 

  // let toVote  = await newVoteContract.toVote(1,true,gas);
  // console.log("[投票成功]");
  // await toVote.wait(1);
  
  // let toVote2  = await newVoteContract.conncet(deployer2).toVote(1,true,gas);
  // console.log("[投票成功2]");
  // await toVote2.wait(1);

  // //移动5天后
  // await moveTime(5*60);
  // await moveBlock(1);
  
  // let reject  = await newVoteContract.reject(1,"xx",gas);
 
  // let toVote3  = await newVoteContract.toVote(1,true,gas);
  // console.log("[投票成功]");
  // await toVote3.wait(1);

  // const  execute = await newVoteContract.execute(1,gas);
  // console.log(execute)
 }

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
=======
    let veToken;
    let token;
    let deployerAddress;
        const [deployer] = await ethers.getSigners();
        deployerAddress = deployer.address;
        console.log("deployerAddress=",deployer.address);

        const VeToken = await hre.ethers.getContractFactory("VeToken");
        const veTokenContract = await VeToken.deploy();
        await veTokenContract.deployed();
        console.log("veTokenContract deployed to:", veTokenContract.address);
      
        const vote = await hre.ethers.getContractFactory("Vote");
        const voteContract = await  vote.deploy();
        await voteContract.deployed();
        console.log("VoteContract deployed to:", voteContract.address);
      
        const auction = await hre.ethers.getContractFactory("Auction");
        const auctionContract = await  auction.deploy();
        await auctionContract.deployed();
        console.log("auctionContract deployed to:", auctionContract.address);
        
        const vault = await hre.ethers.getContractFactory("Vault");
        const vaultContract = await  vault.deploy();
        await vaultContract.deployed();
        console.log("vaultContract deployed to:", vaultContract.address);
      
        const Settings = await hre.ethers.getContractFactory("Settings");
        const SettingsContract = await Settings.deploy();
        await SettingsContract.deployed();
        console.log("veTokenContract deployed to:", SettingsContract.address);
      
        const Factory = await hre.ethers.getContractFactory("Factory"); 
        const factoryContract = await  Factory.deploy(SettingsContract.address);
        await factoryContract.deployed();
        console.log("factoryContract deployed to:", factoryContract.address);
      
        const division = await hre.ethers.getContractFactory("Division"); 
        const divisionContract = await  division.deploy();
        await divisionContract.deployed();
        console.log("divisionContract deployed to:", divisionContract.address);
      
        const router = await hre.ethers.getContractFactory("Router"); 
        const routerContract = await router.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
        await routerContract.deployed();
        console.log("routerContract deployed to:", routerContract.address);
      
        await factoryContract.setLogic(routerContract.address,true,gas);
       
        let test =await factoryContract.mint(routerContract.address,"test",gas);
        await test.wait(1);
      
        const newRouterAddress = await factoryContract.routers(0)
        const newRouterContracy = await router.attach(newRouterAddress)
        console.log("newRouterAddress : ",newRouterAddress)
        
        //--------------------------------Vault------------------------------------
        const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
        const TestERC1155Contract = await  TestERC11555.deploy();
      
        await TestERC1155Contract.deployed();
       
        const mint1 = await TestERC1155Contract.mint(deployerAddress,1,10,gas)
        await mint1.wait(1);
      
        const mint2 = await TestERC1155Contract.mint(deployerAddress,2,10,gas)
        await mint2.wait(1);
        
        const mint3 = await TestERC1155Contract.mint(deployerAddress,3,10,gas)
        await mint3.wait(1);
      
        let newVaultAddress =  await newRouterContracy.vault();
        console.log("newVaultAddress : ",newVaultAddress);
         const setApprovalForAll= await TestERC1155Contract.setApprovalForAll(newVaultAddress,true,gas);
        console.log("【aprove】");
        await setApprovalForAll.wait(1);
      
        const deposit = await newRouterContracy.curatorDeposit(
          [TestERC1155Contract.address,TestERC1155Contract.address,TestERC1155Contract.address],
          [1,2,3],
          [10,10,10]
          ,gas);
        console.log("【curatorDeposit】");
        await deposit.wait(1);
      
        const tx1  = await newRouterContracy.issue(utils.parseUnits("10000",18) ,"Tcoin",10,utils.parseUnits("10",18),31449600,31449600,gas)
        console.log("【issue】");
        await tx1.wait(1);
        // ---------------------------------------------------------- 质押
        //生成 token合约 (Division)
        const newDivisionAddress = await newRouterContracy.division();
        token = await divisionContract.attach(newDivisionAddress);
        console.log("tokenAddress = ",token.address);
        
        let balanceOfMe = await token.balanceOf(deployerAddress)
        console.log(String(balanceOfMe))

        const newVeTokenAddress = await newRouterContracy.veToken();
        veToken = await veTokenContract.attach(newVeTokenAddress);
        console.log("vetokenAddress = ",veToken.address);
   
        await moveTime(3600);
        await moveBlock(1);
        let current = await blockInfo();
        console.log("当前区块时间：",current);
        const amount = utils.parseUnits("1000"); 
        
        // token授权给veToken
        let approveTx = await token.approve(veToken.address,amount+"");
        let approveResult =  await approveTx.wait();
        console.log("授权成功！");

        // 质押
        // let unLockedTime = Date.parse(new Date())/1000 + DELAY_WEEK * 4;
        let unLockedTime = current + DELAY_WEEK * 4;
        console.log("质押锁定时间：",unLockedTime);
        console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
        let tx = await veToken.createLock(amount+"",unLockedTime);
        let tx2 = await tx.wait();
         // ---------------------------------------------------------- 投票
        const newVote = await newRouterContracy.vote();
        const newVoteContract = await vote.attach(newVote);
        console.log(await newVoteContract.getVeToken());
        await moveTime(DELAY_WEEK * 3);
        await moveBlock(1);
        console.log(1);
        let createVote  = await newVoteContract.createVote("xx","setVeTokenAmount","xx",1,3,gas);
        console.log(createVote)
        // console.log("用户的代币数量：" ,await veToken.userOfEquity(deployerAddress))
        // console.log("token总量：", await newVoteContract.getTokenSup());
        // console.log("总量的5%数量：",await newVoteContract.getTokenSup() * 5 / 100)
        // // await newVoteContract.getVeTokenMaxRewardDuration();
        // let createVote  = await newVoteContract.createVote("xx","setVeTokenAmount","xx",1,DELAY_WEEK*10,gas);
        //   await  createVote.wait();
        // // console.log("createVote");
    };
  
 main()
>>>>>>> Stashed changes

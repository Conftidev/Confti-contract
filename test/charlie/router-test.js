
//使用说明，在终端执行 npx hardhat test ./test/veToken-reward-test.js
//个人奖励单人测式角本
const { inputToConfig } = require("@ethereum-waffle/compiler");
const { expect, assert, AssertionError } = require("chai");
const { ethers,network,deployments} = require("hardhat");
const { provider } = waffle;
const { utils, BigNumber} = require("ethers");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const DELAY_WEEK = 604800; // 1 week 

const gas ={
    gasPrice:1097302934,
    gasLimit:20000000
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

async function getAddr(account){
    return await account.address
}

async function efail(action,name){
  let result = false
  try {
    console.log("异常断言："+name);
    await action;
    result = true;
    console.log("预期异常，但是通过:"+name);
  } catch (error) {
    console.log("预期异常，结果异常:"+name+error);
  }finally{
    if(result) throw "预期异常, 但是通过:"+name;
  }
}
async function epass(action,name){
  try {
    console.log("正确断言："+name);
    await action;
    console.log("预期正确，结果正确:"+name);
  } catch (error) {
    console.log("预期正确，结果错误:"+name+error);
    throw "预期正确，结果错误:"+name+error;
  }
}

async function getUser(index){
    const accounts = await hre.ethers.getSigners();
    const user = accounts[index];
    console.log(user.address);
    return user;
}
async function blockInfo(){
    console.log("区块号：",await provider.getBlockNumber());
    console.log("区块时间：",(await provider.getBlock()).timestamp);
    return (await provider.getBlock()).timestamp;
}

async function getRouter(factory, routerTemplate,user){

    let mint = await factory.mint(routerTemplate.address,"testx")
    await mint.wait(1);

    const Router = await hre.ethers.getContractFactory("Router"); 
    const router = await Router.attach(factory.lastMint(user.address));
    console.log("mint success, router address:" + await router.address);

    return router.connect(user);
}
async function getVault(router,user){

  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.attach(router.vault());
  return vault.connect(user);
}

describe("测式Router合约", async ()=> {
  async function deployTokenFixture(){  

        const VeToken = await hre.ethers.getContractFactory("VeToken");
        const veTokenContract = await VeToken.deploy();
        await veTokenContract.deployed();
        console.log("veTokenContract deployed to:", veTokenContract.address);
      
        const Vote = await hre.ethers.getContractFactory("Vote");
        const voteContract = await  Vote.deploy();
        await voteContract.deployed();
        console.log("VoteContract deployed to:", voteContract.address);
      
        const Auction = await hre.ethers.getContractFactory("Auction");
        const auctionContract = await  Auction.deploy();
        await auctionContract.deployed();
        console.log("auctionContract deployed to:", auctionContract.address);
        
        const Vault = await hre.ethers.getContractFactory("Vault");
        const vaultContract = await  Vault.deploy();
        await vaultContract.deployed();
        console.log("vaultContract deployed to:", vaultContract.address);
      
        const Settings = await hre.ethers.getContractFactory("Settings");
        const settingsContract = await Settings.deploy();
        await settingsContract.deployed();
        console.log("veTokenContract deployed to:", settingsContract.address);
      
        const Factory = await hre.ethers.getContractFactory("Factory"); 
        const factoryContract = await  Factory.deploy(settingsContract.address);
        await factoryContract.deployed();
        console.log("factoryContract deployed to:", factoryContract.address);

        const Division = await hre.ethers.getContractFactory("Division"); 
        const divisionContract = await  Division.deploy();
        await divisionContract.deployed();
        console.log("divisionContract deployed to:", divisionContract.address);
      
        const Router = await hre.ethers.getContractFactory("Router"); 
        routerContract = await Router.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
        await routerContract.deployed();
        console.log("routerContract deployed to:", routerContract.address);
      
        let setLogic = await factoryContract.setLogic(routerContract.address,true,gas)
        await setLogic.wait(1);  
        console.log("setLogic true");

        user = await getUser(1);
        ufactory = factoryContract.connect(user);
        let mint = await ufactory.mint(routerContract.address,"testx")
        await mint.wait(1);
        
        const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
        ntoken = await  TestERC11555.deploy();
      
        deployerAddress = await user.address;
        await ntoken.deployed();
        ntoken = ntoken.connect(user);

        const mint1 = await ntoken.mintBatch(deployerAddress,55,gas);
        await mint1.wait(1);
        
        console.log("ntoken 1 success:" + await ntoken.address);

        ntoken2 = await  TestERC11555.deploy();
      
        await ntoken2.deployed();
        ntoken2 = ntoken2.connect(user);
       
        const mint12 = await ntoken2.mint(deployerAddress,1,10000,gas)
        await mint12.wait(1);
      
        const mint22 = await ntoken2.mint(deployerAddress,2,10000,gas)
        await mint22.wait(1);
        
        const mint32 = await ntoken2.mint(deployerAddress,3,10000,gas)
        await mint32.wait(1);
        console.log("ntoken 2 success:" + await ntoken2.address);


        const ERC721 = await hre.ethers.getContractFactory("contracts/test/ERC721.sol:TestERC721"); 
        ntoken3 = await  ERC721.deploy();
        ntoken3 = ntoken3.connect(user);

        const mint13 = await ntoken3.mint(deployerAddress,1,gas)
        await mint13.wait(1);
      
        const mint23 = await ntoken3.mint(deployerAddress,2,gas)
        await mint23.wait(1);
        
        const mint33 = await ntoken3.mint(deployerAddress,3,gas)
        await mint33.wait(1);
        console.log("ntoken 3 success:" + await ntoken3.address);

        router = await Router.attach(ufactory.routers(0));
        router = router.connect(user);
        console.log("mint success, router address:" + await router.address);

        vault = await Vault.attach(router.vault());
        vault = vault.connect(user);

        return {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract};

    }

    
    xit("curatorDeposit: 未授权应失败",async ()=>{ 
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);

      const n_addr = getAddr(ntoken);
      console.log(n_addr);
      const deposit = await router.curatorDeposit(
        [n_addr,n_addr,n_addr],
        [1,2,3],
        [10,10,10]
        ,gas);
      await efail(deposit); 
    });

    xit("curatorDeposit: 部分未授权应失败", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);

      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address,ntoken.address,ntoken2.address],
        [1,2,3],
        [10,10,10]
        ,gas);
      await efail(deposit); 
    });
    xit("curatorDeposit: 3个数组个数不等应失败1", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address,ntoken.address],
        [1,2,3],
        [10,10,10]
        ,gas);
      await efail(deposit); 
        
    });
    xit("curatorDeposit: 3个数组个数不等应失败2", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit2 = await router.curatorDeposit(
        [ntoken.address,ntoken.address,ntoken.address],
        [1,2],
        [10,10,10]
        ,gas);
      await efail(deposit2); 

    });
    xit("curatorDeposit: 3个数组个数不等应失败3", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit3 = await router.curatorDeposit(
        [ntoken.address,ntoken.address,ntoken.address],
        [1,2,3],
        [10,10]
        ,gas);
      await efail(deposit3); 
    });
    xit("curatorDeposit: 单类NFT(1155)应成功", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1);
      console.log(await vault.getFreedomNFT());
 
      // console.log(await vault.getNftState());

      // console.log(await vault.getEntireVaultState());

      // console.log(await vault.getNftActivity());

    });
    xit("curatorDeposit: 多类NFT应成功. 校验vault nft 余额", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address,ntoken.address,ntoken.address],
        [1,2,3],
        [4,5,6]
        ,gas);
      await deposit.wait(1); 


    });
    xit("curatorDeposit: NFT种类等于50应成功", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const addrs = [];
      const ids = [];
      const amounts = [];
      for (let index = 0; index < 50; index++) {
        addrs[index] = ntoken.address;
        ids[index] = index;
        amounts[index] = 10;        
      }

      const deposit = await router.curatorDeposit(
        addrs,ids,amounts
        ,gas);
      await deposit.wait(1); 
      console.log(await vault.getFreedomNFT());

    });
    xit("curatorDeposit: NFT种类大于50应失败", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const addrs = [];
      const ids = [];
      const amounts = [];
      for (let index = 0; index < 55; index++) {
        addrs[index] = ntoken.address;
        ids[index] = index;
        amounts[index] = 10;        
      }

      const deposit = await router.curatorDeposit(
        addrs,ids,amounts
        ,gas);
      await efail(deposit); 
      });
    xit("curatorDeposit: 多类合约应成功", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);
      
      const setApprovalForAll2= await ntoken2.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove 2】");
      await setApprovalForAll2.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address,ntoken.address,ntoken2.address],
        [1,2,3],
        [10,10,10]
        ,gas);
      await deposit.wait(1); 
    });
    xit("curatorDeposit: 721应成功", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
     
      const setApprovalForAll2= await ntoken3.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove 2】");
      await setApprovalForAll2.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken3.address,ntoken3.address],
        [1,2],
        [1,1]
        ,gas);
      await deposit.wait(1); 
    });
    xit("curatorDeposit: 多标准（混合）应成功, 成功后NFT数值校验", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);
      
      const setApprovalForAll2= await ntoken3.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove 2】");
      await setApprovalForAll2.wait(1);

      console.log(await ntoken.balanceOf(await user.address,3));

      const deposit = await router.curatorDeposit(
        [ntoken.address,ntoken.address,ntoken3.address],
        [1,2,3],
        [4,5,6]
        ,gas);
      await deposit.wait(1); 

      console.log(await ntoken.balanceOf(await user.address,3));

      console.log(await vault.getFreedomNFT());
      console.log((await vault.nfts(1))["amount"]);
      console.log((await vault.nfts(2))["amount"]);
      console.log((await vault.nfts(3))["amount"]);
      console.log(await ntoken.balanceOf(await vault.address,1));
      console.log(await ntoken.balanceOf(await vault.address,2));
      console.log(await ntoken3.balanceOf(await vault.address));
      expect((await vault.nfts(1))["amount"]).to.equal(4);
      expect((await vault.nfts(2))["amount"]).to.equal(5);
      expect((await vault.nfts(3))["amount"]).to.equal(6);

      expect(await ntoken.balanceOf(await vault.address,1)).to.equal(4);
      expect(await ntoken.balanceOf(await vault.address,2)).to.equal(5);
      expect(await ntoken3.balanceOf(await vault.address)).to.equal(1);
    });

    xit("curatorDeposit: 二次质押应成功", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);
      
      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      const deposit2 = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit2.wait(1); 

      
      console.log(await vault.getFreedomNFT());
      console.log((await vault.nfts(1))["amount"]);
      console.log(await ntoken.balanceOf(await vault.address,1));
      expect((await vault.nfts(1))["amount"]).to.equal(10);

      expect(await ntoken.balanceOf(await vault.address,1)).to.equal(10);

    });
    xit("curatorDeposit: 非curator操作应失败", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);

      const user2 = await getUser(2);
      router2 = router.connect(user2);

      let transfer = await ntoken.safeTransferFrom(user.address,user2.address,1,100,[],gas)
      await transfer.wait(1);

      ntokenx = ntoken.connect(user2);
      const setApprovalForAll= await ntokenx.setApprovalForAll(router2.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);
      
      const deposit = await router2.curatorDeposit(
        [ntokenx.address],
        [1],
        [5]
        ,gas);
      await efail(deposit); 
    });
    xit("issue: 已质押应操作成功", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract} = await loadFixture(deployTokenFixture);
     
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      await setApprovalForAll.wait(1);
      console.log("【aprove】");


      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      console.log("deposit");
      let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1.2",18),6048000,6048000,gas)
      await issue.wait(1); 

      let supply = 10n**22n;
      let user_expect_amount = supply*(10000n - 5000n - 100n)/10000n;
      console.log(user_expect_amount);


      const Division = await hre.ethers.getContractFactory("Division"); 
      const division = await Division.attach(await router.division());
      const user_amount = await division.balanceOf(user.address)
      console.log(user_amount);

      // 断言 用户收到token 符合预期
      expect(0n).to.equal(BigInt(user_amount) - user_expect_amount);

      // 断言 治理费 符合预期
      let reserveAmount = await division.balanceOf(await settingsContract.feeReceiver());
      let fee_expect_amount = supply / 100n
      expect(0n).to.equal(BigInt(reserveAmount) - fee_expect_amount);
      console.log(reserveAmount);

      
      // 断言 奖励总额等于预期
      const Vetoken = await hre.ethers.getContractFactory("VeToken"); 
      const vetoken = await Vetoken.attach(await router.veToken());
      let reward_expect_amount = supply / 2n
      let reward_amount = await vetoken.totalReward();
      expect(0n).to.equal(BigInt(reward_amount) - reward_expect_amount);
      console.log(reward_amount);

      // 断言 起拍价格与设置一致
      const Auction = await hre.ethers.getContractFactory("Auction");
      const auction = await Auction.attach(router.auction()).connect(user)
      await efail(auction.start({value : utils.parseUnits("1.19",18)}),"低于拍卖价格，应失败");
      await epass(auction.start({value : utils.parseUnits("1.2",18)}),"等于拍卖价格，应成功");

    });
    xit("issue: reserveRatio_ 设置为0，应成功", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract} = await loadFixture(deployTokenFixture);
     
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      await setApprovalForAll.wait(1);
      console.log("【aprove】");


      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      console.log("deposit");
      let issue  = await router.issue(utils.parseUnits("100000",18) ,"Tcoin",0,utils.parseUnits("1",18),6048000,6048000,gas)
      await issue.wait(1); 

      let supply = 10n**23n;
      let user_expect_amount = supply*(10000n - 100n)/10000n;
      console.log(user_expect_amount);


      const Division = await hre.ethers.getContractFactory("Division"); 
      const division = await Division.attach(await router.division()).connect(user);
      const user_amount = await division.balanceOf(user.address)
      console.log(user_amount);

      // 断言 用户收到token 符合预期
      expect(0n).to.equal(BigInt(user_amount) - user_expect_amount);

      // 断言 治理费 符合预期
      let reserveAmount = await division.balanceOf(await settingsContract.feeReceiver());
      let fee_expect_amount = supply / 100n
      expect(0n).to.equal(BigInt(reserveAmount) - fee_expect_amount);
      console.log(reserveAmount);

      
      // 断言 奖励总额等于预期
      const Vetoken = await hre.ethers.getContractFactory("VeToken"); 
      const vetoken = await Vetoken.attach(await router.veToken()).connect(user);
      let reward_expect_amount = 0n
      let reward_amount = await vetoken.totalReward();
      expect(0n).to.equal(BigInt(reward_amount) - reward_expect_amount);
      console.log(reward_amount);


      
      const amount = ethers.utils.parseUnits("100",18);
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",division.address);

      let mybalance = await division.balanceOf(user.address)
      console.log("个人token余额：",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await division.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 1;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");

    });
    xit("issue: reserveRatio_ 设置为9900", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract} = await loadFixture(deployTokenFixture);
     
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      await setApprovalForAll.wait(1);
      console.log("【aprove】");


      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      console.log("deposit");
      let issue  = await router.issue(utils.parseUnits("100000",18) ,"Tcoin",0,utils.parseUnits("1",18),6048000,6048000,gas)
      await issue.wait(1); 

      let supply = 10n**23n;
      let user_expect_amount = supply*(10000n - 100n)/10000n;
      console.log(user_expect_amount);


      const Division = await hre.ethers.getContractFactory("Division"); 
      const division = await Division.attach(await router.division()).connect(user);
      const user_amount = await division.balanceOf(user.address)
      console.log(user_amount);

      // 断言 用户收到token 符合预期
      expect(0n).to.equal(BigInt(user_amount) - user_expect_amount);

      // 断言 治理费 符合预期
      let reserveAmount = await division.balanceOf(await settingsContract.feeReceiver());
      let fee_expect_amount = supply / 100n
      expect(0n).to.equal(BigInt(reserveAmount) - fee_expect_amount);
      console.log(reserveAmount);

      
      // 断言 奖励总额等于预期
      const Vetoken = await hre.ethers.getContractFactory("VeToken"); 
      const vetoken = await Vetoken.attach(await router.veToken()).connect(user);
      let reward_expect_amount = 0n
      let reward_amount = await vetoken.totalReward();
      expect(0n).to.equal(BigInt(reward_amount) - reward_expect_amount);
      console.log(reward_amount);


      
      const amount = ethers.utils.parseUnits("100",18);
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",division.address);

      let mybalance = await division.balanceOf(user.address)
      console.log("个人token余额：",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await division.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 1;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");

    });
    xit("curatorDeposit: 未质押应操作失败", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
      await efail(issue); 
    });
    xit("issue: 已铸造应操作失败", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
     
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
      await issue.wait(1); 
      let issue2  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
      await efail(issue2); 
    });
    xit("issue: 已铸造-再质押应操作失败", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
     
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
      await issue.wait(1); 
      
      const deposit2 = await router.curatorDeposit(
        [ntoken.address],
        [2],
        [5]
        ,gas);
        await efail(deposit2); 
    });
    xit("issue: 发行量小于10000应操作失败", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
     
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      let issue  = await router.issue(utils.parseUnits("9999",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
      await efail(issue); 
    });
    xit("issue: reserveRatio_ 大于9900 应失败", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
     
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",10000,utils.parseUnits("1",18),6048000,6048000,gas)
      await efail(issue); 
    });
    xit("issue: 发行量为负数应失败", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
     
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      try{await router.issue( -1*10**24 ,"Tcoin",1000,utils.parseUnits("1",18),6048000,6048000,gas);throw 1}catch(error){if(error==1)throw("预期异常,实际通过：bid")}

    });
    xit("issue: reserveRatio_ 为负数应失败", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
     
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      try{ await router.issue(utils.parseUnits("10000",18) ,"Tcoin",-1000,utils.parseUnits("1",18),6048000,6048000,gas);throw 1}catch(error){if(error==1)throw("预期异常,实际通过：bid")}
    });
    xit("issue: 质押时间小于4周，应失败", async ()=>{
        const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
       
        const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
        console.log("【aprove】");
        await setApprovalForAll.wait(1);
  
        const deposit = await router.curatorDeposit(
          [ntoken.address],
          [1],
          [5]
          ,gas);
        await deposit.wait(1); 
        let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),DELAY_WEEK*4-1,6048000,gas)
        await efail(issue); 
     });

    xit("issue: 质押时间大于52周应失败", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
      
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),DELAY_WEEK*52+1,6048000,gas)
      await efail(issue); 
    });
    xit("issue: 奖励时间小于4周，应失败", async ()=>{
      const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
     
      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 
      let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,DELAY_WEEK*4-1,gas)
      await efail(issue); 
   });

  xit("issue: 奖励时间大于52周应失败", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
    
    const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
    console.log("【aprove】");
    await setApprovalForAll.wait(1);

    const deposit = await router.curatorDeposit(
      [ntoken.address],
      [1],
      [5]
      ,gas);
    await deposit.wait(1); 
    let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,DELAY_WEEK*52+1,gas)
    await efail(issue); 
  });
  xit("issue: 非curator操作应失败", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3} = await loadFixture(deployTokenFixture);
    
    const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
    console.log("【aprove】");
    await setApprovalForAll.wait(1);

    const deposit = await router.curatorDeposit(
      [ntoken.address],
      [1],
      [5]
      ,gas);
    await deposit.wait(1); 
    const user2 = await getUser(2);
    router2 = router.connect(user2);
    let issue  = await router2.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
    await efail(issue); 
  });
 
 
 
  xit("cash: 拍卖成功，应可以操作", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract} = await loadFixture(deployTokenFixture);
   
    const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
    await setApprovalForAll.wait(1);
    console.log("【aprove】");


    const deposit = router.curatorDeposit([ntoken.address],[1],[5]);
    await epass(deposit,"deposit"); 
    
    let issue  = router.issue(utils.parseUnits("10000",18) ,"Tcoin",0,utils.parseUnits("10",18),6048000,6048000,gas)
    await epass(issue,"issue"); 

    const Auction = await hre.ethers.getContractFactory("Auction");
    const auction = await Auction.attach(router.auction()).connect(user)
    await epass(auction.start({value : utils.parseUnits("10",18)}),"等于拍卖价格，应成功");
    await moveTime(DELAY_WEEK);
    await moveBlock(1);
    await epass(auction.end(),"END");

    const Division = await hre.ethers.getContractFactory("Division"); 
    const division = await Division.attach(await router.division()).connect(user);

    const amount = ethers.utils.parseUnits("1000")
    const userx = await getUser(2);
    const transfer = await division.transfer(userx.address,amount)
    await epass(transfer,"transfer");
    const user_amount = await division.balanceOf(userx.address)
    console.log(user_amount);
    const cash_befor = await ethers.provider.getBalance(await userx.address);
    console.log(cash_befor);


    const router2 = router.connect(userx);
    await epass(router2.cash(),"销毁");

    const user_amount2 = await division.balanceOf(userx.address)
    console.log(user_amount2);
    const cash_after = await ethers.provider.getBalance(await userx.address);
    console.log(cash_after);

    let get_amount = BigInt(cash_after - cash_befor);
    console.log(get_amount);
    console.log(ethers.utils.formatEther( get_amount));
  });

  xit("cash: 99%领取", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract} = await loadFixture(deployTokenFixture);
   
    const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
    await setApprovalForAll.wait(1);
    console.log("【aprove】");


    const deposit = router.curatorDeposit([ntoken.address],[1],[5]);
    await epass(deposit,"deposit"); 
    
    let issue  = router.issue(utils.parseUnits("10000",18) ,"Tcoin",0,utils.parseUnits("10",18),6048000,6048000,gas)
    await epass(issue,"issue"); 

    const Auction = await hre.ethers.getContractFactory("Auction");
    const auction = await Auction.attach(router.auction()).connect(user)
    await epass(auction.start({value : utils.parseUnits("10",18)}),"等于拍卖价格，应成功");
    await moveTime(DELAY_WEEK);
    await moveBlock(1);
    await epass(auction.end(),"END");

    const Division = await hre.ethers.getContractFactory("Division"); 
    const division = await Division.attach(await router.division()).connect(user);

    const amount = ethers.utils.parseUnits("9900")
    const userx = await getUser(2);
    const transfer = await division.transfer(userx.address,amount)
    await epass(transfer,"transfer");
    const user_amount = await division.balanceOf(userx.address)
    console.log(user_amount);
    const cash_befor = await ethers.provider.getBalance(await userx.address);
    console.log(cash_befor);


    const router2 = router.connect(userx);
    await epass(router2.cash(),"销毁");

    const user_amount2 = await division.balanceOf(userx.address)
    console.log(user_amount2);
    const cash_after = await ethers.provider.getBalance(await userx.address);
    console.log(cash_after);

    let get_amount = BigInt(cash_after - cash_befor);
    console.log(get_amount);
    console.log(ethers.utils.formatEther( get_amount));

    const feeReceiver = await getUser(6);
    let router3 = router.connect(feeReceiver);
    await epass(router3.cash(),"销毁");
    console.log(ethers.utils.formatEther( await ethers.provider.getBalance(await feeReceiver.address)));

  });

  xit("cash: 50% 奖励未发放，领取", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract} = await loadFixture(deployTokenFixture);
   
    const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
    await setApprovalForAll.wait(1);
    console.log("【aprove】");


    const deposit = router.curatorDeposit([ntoken.address],[1],[5]);
    await epass(deposit,"deposit"); 
    
    let issue  = router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("10",18),6048000,6048000,gas)
    await epass(issue,"issue"); 

    const Auction = await hre.ethers.getContractFactory("Auction");
    const auction = await Auction.attach(router.auction()).connect(user)
    await epass(auction.start({value : utils.parseUnits("10",18)}),"等于拍卖价格，应成功");
    await moveTime(DELAY_WEEK);
    await moveBlock(1);
    await epass(auction.end(),"END");

    const Division = await hre.ethers.getContractFactory("Division"); 
    const division = await Division.attach(await router.division()).connect(user);

    const amount = ethers.utils.parseUnits("1000")
    const userx = await getUser(2);
    const transfer = await division.transfer(userx.address,amount)
    await epass(transfer,"transfer");
    const user_amount = await division.balanceOf(userx.address)
    console.log(user_amount);
    const cash_befor = await ethers.provider.getBalance(await userx.address);
    console.log(cash_befor);


    const router2 = router.connect(userx);
    await epass(router2.cash(),"销毁");

    const user_amount2 = await division.balanceOf(userx.address)
    console.log(user_amount2);
    const cash_after = await ethers.provider.getBalance(await userx.address);
    console.log(cash_after);

    let get_amount = BigInt(cash_after - cash_befor);
    console.log(get_amount);
    console.log(ethers.utils.formatEther( get_amount));

    const feeReceiver = await getUser(6);
    let router3 = router.connect(feeReceiver);
    await epass(router3.cash(),"销毁");
    console.log(ethers.utils.formatEther( await ethers.provider.getBalance(await feeReceiver.address)));

  });

  xit("cash: 拍卖未开始，应失败", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract} = await loadFixture(deployTokenFixture);
   
    const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
    await setApprovalForAll.wait(1);
    console.log("【aprove】");


    const deposit = await router.curatorDeposit(
      [ntoken.address],
      [1],
      [5]
      ,gas);
    await deposit.wait(1); 
    console.log("deposit");
    let issue  = await router.issue(utils.parseUnits("100000",18) ,"Tcoin",0,utils.parseUnits("1",18),6048000,6048000,gas)
    await issue.wait(1); 
    
    await efail(router.cash(),"cash");

  });
  xit("cash: 拍卖未结束，应失败", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract} = await loadFixture(deployTokenFixture);
   
    const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
    await setApprovalForAll.wait(1);
    console.log("【aprove】");


    const deposit = await router.curatorDeposit(
      [ntoken.address],
      [1],
      [5]
      ,gas);
    await deposit.wait(1); 
    console.log("deposit");
    let issue  = await router.issue(utils.parseUnits("100000",18) ,"Tcoin",0,utils.parseUnits("1",18),6048000,6048000,gas)
    await issue.wait(1); 

    
    const Auction = await hre.ethers.getContractFactory("Auction");
    const auction = await Auction.attach(router.auction()).connect(user)
    await epass(auction.start({value : utils.parseUnits("10",18)}),"等于拍卖价格，应成功");
    
    await efail(router.cash(),"cash");

  });
  
  xit("cash: 持有token为0，应失败", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract} = await loadFixture(deployTokenFixture);
   
    const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
    await setApprovalForAll.wait(1);
    console.log("【aprove】");


    const deposit = router.curatorDeposit([ntoken.address],[1],[5]);
    await epass(deposit,"deposit"); 
    
    let issue  = router.issue(utils.parseUnits("10000",18) ,"Tcoin",0,utils.parseUnits("10",18),6048000,6048000,gas)
    await epass(issue,"issue"); 

    const Auction = await hre.ethers.getContractFactory("Auction");
    const auction = await Auction.attach(router.auction()).connect(user)
    await epass(auction.start({value : utils.parseUnits("10",18)}),"等于拍卖价格，应成功");
    await moveTime(DELAY_WEEK);
    await moveBlock(1);
    await epass(auction.end(),"END");

  
    const router2 = router.connect(await getUser(3));
    await efail(router2.cash(),"销毁");

 
  });

  it("cash: 有质押奖励，已领取，验证获得ETH正确", async ()=>{
    const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract} = await loadFixture(deployTokenFixture);
   
    const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
    await setApprovalForAll.wait(1);
    console.log("【aprove】");

    const deposit = await router.curatorDeposit(
      [ntoken.address],
      [1],
      [5]
      ,gas);
    await deposit.wait(1); 
    console.log("deposit");
    let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
    await issue.wait(1); 

    const Division = await hre.ethers.getContractFactory("Division"); 
    const token = await Division.attach(await router.division()).connect(user);
    const VeToken = await hre.ethers.getContractFactory("VeToken"); 
    const vetoken = await VeToken.attach(await router.veToken()).connect(user);
    console.log(await token.totalSupply());
    console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    let user_balance_befor = await token.balanceOf(user.address)

    const amount = ethers.utils.parseUnits("100");

    let mybalance = await token.balanceOf(user.address)
    console.log("个人token余额：",ethers.utils.formatEther(mybalance))

    //token授权给veToken
    let approveTx = await token.approve(vetoken.address,amount+"");
    await epass(approveTx,"授权");

    //质押
    let TotalR = await vetoken.totalReward();
    console.log("TotalR = ",TotalR)

    let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
    console.log("质押锁定时间：",unLockedTime);
    console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
    let createLock = await vetoken.createLock(amount+"",unLockedTime);
    await epass(createLock,"createLock");

    //移动5周后
    await moveTime(DELAY_WEEK * 5);
    await moveBlock(1);

    // 领取奖励，提取token
    await epass(vetoken.claim(),"claim");

    await epass(vetoken.withdraw(),"withdraw");

    // 验证奖励领取
    mybalance = await token.balanceOf(user.address)
    let user_balance_after = await token.balanceOf(user.address)
    console.log("个人token余额：",ethers.utils.formatEther(user_balance_after));
    expect(true).to.equal(user_balance_after-user_balance_befor>0n)

    // 拍卖
    const Auction = await hre.ethers.getContractFactory("Auction");
    const auction = await Auction.attach(router.auction()).connect(user)
    await epass(auction.start({value : utils.parseUnits("10",18)}),"等于拍卖价格，应成功");
    await moveTime(DELAY_WEEK);
    await moveBlock(1);
    await epass(auction.end(),"END");


    console.log("发行量"+ await token.totalSupply());
    console.log("奖励数量"+ await vetoken.totalClaimable());

    // user 兑换（销毁）
    const cash_befor_eth1 = await ethers.provider.getBalance(await user.address);
    console.log("user1 eth余额："+cash_befor_eth1);
    console.log("user1 token余额：",ethers.utils.formatEther(await token.balanceOf(user.address)));
    await epass(router.cash(),"销毁");
    const cash_after_eth1 = await ethers.provider.getBalance(await user.address);
    console.log(cash_after_eth1);

    let get_amount1 = BigInt(cash_after_eth1 - cash_befor_eth1);
    console.log(get_amount1);
    console.log(ethers.utils.formatEther( get_amount1));

    // feeReceiver 兑换（销毁）
    let feeReceiver = await getUser(6);
    const cash_befor_ethf = await ethers.provider.getBalance(feeReceiver.address);
    console.log(cash_befor_ethf);
    console.log("feeReceiver token余额：",ethers.utils.formatEther(await token.balanceOf(feeReceiver.address)));
    let router_f = router.connect(feeReceiver);
    await epass(router_f.cash(),"销毁");
    const cash_after_ethf = await ethers.provider.getBalance(feeReceiver.address);
    console.log(cash_after_ethf);

    let get_amountf = BigInt(cash_after_ethf - cash_befor_ethf);
    console.log(get_amountf);
    console.log(ethers.utils.formatEther( get_amountf));

    let sum_get_amount = ethers.utils.formatEther( get_amountf + get_amount1);
    console.log("兑换ETH总量"+ sum_get_amount)
    expect(true).to.equal(10 - sum_get_amount < 0.0001);
  });

  // it("cash: 有质押奖励，未领取", async ()=>{
  //   const {router,vault,user,routerContract,ufactory,ntoken,ntoken2,ntoken3,settingsContract} = await loadFixture(deployTokenFixture);
   
  //   const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
  //   await setApprovalForAll.wait(1);
  //   console.log("【aprove】");


  //   const deposit = await router.curatorDeposit(
  //     [ntoken.address],
  //     [1],
  //     [5]
  //     ,gas);
  //   await deposit.wait(1); 
  //   console.log("deposit");
  //   let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
  //   await issue.wait(1); 

  //   const Division = await hre.ethers.getContractFactory("Division"); 
  //   const division = await Division.attach(await router.division()).connect(user);
  //   const VeToken = await hre.ethers.getContractFactory("VeToken"); 
  //   const veToken = await VeToken.attach(await router.veToken()).connect(user);
  //   const user_amount = await division.balanceOf(user.address)
  //   console.log(user_amount);

    
  //   const amount = ethers.utils.parseUnits("1000")
  //   const userx = await getUser(2);
  //   const transfer = await division.transfer(userx.address,amount)
  //   await epass(transfer,"transfer");
  //   const user_amountx = await division.balanceOf(userx.address)
  //   console.log(user_amountx);

  //   let approve = await division.approve(veToken.address,amount);
  //   await epass(approve,"approve"); 

  //   let unLockedTime = await blockInfo() + DELAY_WEEK * 1;
  //   let tx1 = await veToken.createLock(amount,unLockedTime);
  //   await tx1.wait(1);
  //   console.log("质押成功");


  //   console.log("锁定的数据：",await veToken.locked(user.address));
  //   let veOfAfterWeek = await veToken.userOfEquity(user.address);
  //   console.log("vetoken:"+veOfAfterWeek);

  //   await moveTime(DELAY_WEEK);
  //   await moveBlock(1);
  //   let veOfAfterWeek2 = await veToken.userOfEquity(user.address);
  //   console.log("vetoken2:"+veOfAfterWeek2);
  //   console.log("个人当前奖励=",await veToken.claimableToken(user.address));


  //   await epass(vetoken2.claim(),"claim");

  //   await epass(vetoken2.withdraw(),"withdraw");
  //   let mybalance2 = await division.balanceOf(user.address)
  //   console.log("个人token余额：",ethers.utils.formatEther(mybalance2));

  // });

});

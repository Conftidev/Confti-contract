const { inputToConfig } = require("@ethereum-waffle/compiler");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect, assert, AssertionError } = require("chai");
const { ethers,network,deployments} = require("hardhat");
const { provider } = waffle;
const { utils} = require("ethers");
const { minutes } = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration");

const DELAY_WEEK = 604800; // 1 week 

  
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
    console.log("区块号: ",await provider.getBlockNumber());
    console.log("区块时间: ",(await provider.getBlock()).timestamp);
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

async function getIssueRouter(factory, routerTemplate,ntoken,user){
  router = await getRouter(factory, routerTemplate,user);
  await ntoken.setApprovalForAll(router.vault(),true);
  console.log("【aprove】");

  await router.curatorDeposit(
    [ntoken.address],
    [1],
    [5]);
  await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),DELAY_WEEK*20,DELAY_WEEK*5)
  return router;
}

async function stake(token,vetoken,vote,userx,amount){
  let token2 = token.connect(userx)
  let vetoken2 = vetoken.connect(userx)
  let vote2 = vote.connect(userx)

  const transfer = await token.transfer(userx.address,amount)
  await epass(transfer,"transfer")

  //token授权给veToken
  let approve = await token2.approve(vetoken.address,amount);
  await epass(approve,"approve")

  let unLockedTime = await blockInfo() + DELAY_WEEK * 4;
  let createLock = await vetoken2.createLock(amount,unLockedTime);
  await epass(createLock,"createLock")
  return {token2,vetoken2,vote2};
}


describe("测式Vote合约", function () {
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
        const SettingsContract = await Settings.deploy();
        await SettingsContract.deployed();
        console.log("veTokenContract deployed to:", SettingsContract.address);
      
        const Factory = await hre.ethers.getContractFactory("Factory"); 
        const factoryContract = await  Factory.deploy(SettingsContract.address);
        await factoryContract.deployed();
        console.log("factoryContract deployed to:", factoryContract.address);

        const Division = await hre.ethers.getContractFactory("Division"); 
        const divisionContract = await  Division.deploy();
        await divisionContract.deployed();
        console.log("divisionContract deployed to:", divisionContract.address);
      
        const Router = await hre.ethers.getContractFactory("Router"); 
        const routerContract = await Router.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
        await routerContract.deployed();
        console.log("routerContract deployed to:", routerContract.address);
      
        await factoryContract.setLogic(routerContract.address,true)
        console.log("setLogic true");

        const user = await getUser(1);
        const user_addr = await user.address;

        const ufactory = factoryContract.connect(user);
        
        const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
        const ntokenx = await  TestERC11555.deploy();
        console.log("ntoken:"+ntokenx.address)
        const ntoken = ntokenx.connect(user);

        await ntoken.mintBatch(user_addr,10);
        console.log("ntoken 1 success:" + await ntoken.address);

        const router = await getIssueRouter(ufactory,routerContract,ntoken,user);      
        const vault = await Vault.attach(router.vault()).connect(user);
        const vetoken = await VeToken.attach(router.veToken()).connect(user);
        const vote = await Vote.attach(router.vote()).connect(user);
        const auction = await Auction.attach(router.auction()).connect(user);
        const token = await Division.attach(router.division()).connect(user);
        console.log(await vault.address);
        console.log(await vetoken.address);
        console.log(await auction.address);
        console.log(await token.address);
        console.log(await vote.address);


        const amount = ethers.utils.parseUnits("4500");
        console.log("amount=",amount);
        const mybalance = await token.balanceOf(user.address)
        console.log("个人token余额: ",ethers.utils.formatEther(mybalance));

        //token授权给veToken
        const approveTx = await token.approve(vetoken.address,amount);
        const approveResult =  await approveTx.wait();
        console.log("授权成功！");

        const unLockedTime = await blockInfo() + DELAY_WEEK * 10;
        const tx = await vetoken.createLock(amount,unLockedTime);
        await tx.wait(1);
        console.log("质押成功");
        

        return {router,vault,vetoken,auction,token,vote,user,ntoken,ufactory,routerContract};
    }


    xit("1、可以投票", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")

      await epass(vote.toVote(1,true),"投票")
    });

    xit("2、可以否决", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")

      await epass(vote.toVote(1,true),"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(4*60);
      await moveBlock(1);

      await epass(vote.reject(1,"xx","link"),"否决");
    });
    xit("3、可以否决投票", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")

      await epass(vote.toVote(1,true),"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(4*60);
      await moveBlock(1);

      await epass(vote.reject(1,"xx","link"),"否决");
      await epass(vote.toVote(1,true),"否决投票")
      console.log(await vault.getEntireVaultState());


    });
    xit("4、可以执行", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      // 初始状态为0 - freedom
      console.log(await vault.getEntireVaultState());
      expect(0).to.equal(await vault.getEntireVaultState())

      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")

      // 提案后为1 - occupied
      console.log(await vault.getEntireVaultState());
      expect(1).to.equal(await vault.getEntireVaultState())

      await epass(vote.toVote(1,true),"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);


      await epass(vote.execute(1),"执行")

      // 执行成功后，改为0 - freedom
      console.log(await vault.getEntireVaultState());
      expect(0).to.equal(await vault.getEntireVaultState())

    });
    
    xit("5、提案失败执行，不修改拍卖底价，执行拍卖，验证不修改，（拍卖结束，兑换ETH）", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      await epass(vote.execute(1),"执行")
      console.log(await vault.getEntireVaultState());

      // 验证价格不修改
      await efail(auction.start({value : utils.parseUnits("0.9",18)}),"低于拍卖价格，应失败");
      await epass(auction.start({value : utils.parseUnits("1",18)}),"等于拍卖价格，应成功");
    });

    xit("6、提案失败执行之后，可以提交其他提案", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      await epass(vote.execute(1),"执行")
      console.log(await vault.getEntireVaultState());

      let createVote2  = vote.createVote("setVetoken","detail","link",1,3);
      await epass(createVote2,"其他提案")
      
    });
    xit("7、提案失败执行之后，可以提交setPrice提案", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      await epass(vote.execute(1),"执行")
      console.log(await vault.getEntireVaultState());

      const price2 = ethers.utils.parseUnits("11")
      let createVote2  = vote.createVote("setPrice","detail","link",5,price2);
      await epass(createVote2,"setprice提案")
      
    });

    xit("8、提案成功执行，修改拍卖低价，执行拍卖，验证修改，（拍卖结束，兑换ETH）", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")

      await epass(vote.toVote(1,true),"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);
      console.log(await vault.getEntireVaultState());

      await epass(vote.execute(1),"执行")
      console.log(await vault.getEntireVaultState());

      // 验证价格修改
      await efail(auction.start({value : utils.parseUnits("9.9",18)}),"低于拍卖价格，应失败");
      await epass(auction.start({value : utils.parseUnits("10",18)}),"等于拍卖价格，应成功");

    });


    xit("9、提案成功执行之后，可以再次提交其他提案", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")

      await epass(vote.toVote(1,true),"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      await epass(vote.execute(1),"执行")

      let createVote2  = vote.createVote("setVetoken","detail","link",1,3);
      await epass(createVote2,"其他提案")

    });
    xit("10、提案成功执行之后，可以再次提交setPrice提案", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")

      await epass(vote.toVote(1,true),"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      await epass(vote.execute(1),"执行")

      const price2 = ethers.utils.parseUnits("11")
      let createVote2  = vote.createVote("setPrice","detail","link",5,price2);
      await epass(createVote2,"其他提案")

    });
    xit("11、提案setPrice之后，不能提交提案", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")

      let createVote2  = vote.createVote("setVetoken","detail","link",1,3);
      await efail(createVote2,"其他提案")

    });

    xit("12、setprice 提案之后，不影响已创建的提案", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      
      let createVote2  = vote.createVote("setVetoken","detail","link",1,3);
      await epass(createVote2,"其他提案")


      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"setprice提案")


      await epass(vote.toVote(1,true),"其他提案投票")
      await epass(vote.toVote(2,true),"setprice投票")

      const result  = await vote.winningProposal(1);
      console.log(result);
      const result2  = await vote.winningProposal(2);
      console.log(result2);
     
      await moveTime(8*60);
      await moveBlock(1);

      await epass(vote.execute(1),"执行")
      await epass(vote.execute(2),"执行")

    });
    xit("13、提案setPrice之后，不能启动拍卖", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")

      await efail(auction.start({value : utils.parseUnits("1",18)}),"等于拍卖价格，应成功");
    });
    it("14、提案setPrice之后，不影响vetoken合约的操作", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = vote.createVote("setPrice","detail","link",5,price);
      await epass(createVote,"提案")

      let unLockedTime = await blockInfo() + DELAY_WEEK * 111;
      let increaseUnlockTime = vetoken.increaseUnlockTime(unLockedTime);
      await epass(increaseUnlockTime,"vetoken,增加质押时长");
    });


      

});

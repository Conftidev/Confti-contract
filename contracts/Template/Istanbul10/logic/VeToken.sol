//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// pragma abicoder v2;
// import "hardhat/console.sol";

import "../data/VeTokenData.sol";
import "../Interface/IRouterData.sol";
import "../Interface/IVeToken.sol";
import "../Interface/IVault.sol";
import "../../../utils/State.sol";
import "../../../Interface/IDivision.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VeToken is IVeToken , VeTokenData {
    uint256 private constant CREATE_LOCK_TYPE = 1;
    uint256 private constant INCREASE_LOCK_AMOUNT = 2;
    uint256 private constant INCREASE_UNLOCK_TIME = 3;

    uint256 public constant WEEK = 7 * 86400;
    uint256 public constant MULTIPLIER = 10**18;

    uint256 public constant DECIMALS = 18;
    string public constant NAME = "Vote-escrowed Token";
    string public constant SYMBOL = "veToken";


    modifier isWhiteList() {
        require(getRouter().whiteList(msg.sender),"VeToken: The current caller is not on the white list!");
        _;
    }
    modifier nonReentrant() {
        require(!isReentry,"reentry :: Illegal reentrant");
        isReentry = true;
        _;
        isReentry = false;
    }

    function initialize(uint256 totalReward_,uint256 maxPledgeDuration_,uint256 maxRewardDuration_) external {
        require(!initializer,"VeToken: Contract has been initialized!");
        require(maxPledgeDuration_ >= WEEK * 4 && maxPledgeDuration_ <= WEEK * 52,"The longest pledge period is between 4 weeks and 52 weeks!");
        if(maxRewardDuration_>0){
            require(maxRewardDuration_ >= WEEK * 4 && maxRewardDuration_ <= WEEK * 52,"The longest Reward period is between 4 weeks and 52 weeks!");
        }
        initializer = !initializer;
        totalReward = totalReward_;
        maxPledgeDuration = maxPledgeDuration_;
        maxRewardDuration = maxRewardDuration_;

        router = msg.sender;

        supplyPointHistory[0] = Point({
            bias: 0,
            slope: 0,
            ts: block.timestamp,
            blk: block.number
        });
        uint256 t = (block.timestamp / WEEK) * WEEK;
        startTime = t;
        timeCursor = t;
    }

    function getToken() private view returns(address) {
        return getRouter().division();
    }

    function getLocked(address _addr)
        external
        view
        
        returns (LockedBalance memory)
    {
        return locked[_addr];
    }


    function getUserPointEpoch(address _userAddress)
        external
        view
        override
        returns (uint256)
    {
        return userPointEpoch[_userAddress];
    }

    function getSupplyPointHistory(uint256 _index)
        external
        view
        
        returns (Point memory)
    {
        return supplyPointHistory[_index];
    }

    function getUserPointHistory(address _userAddress, uint256 _index)
        public
        view
        
        returns (Point memory)
    {
        return userPointHistory[_userAddress][_index];
    }

    /***
     *@dev Get the most recently recorded rate of voting power decrease for `_addr`
     *@param _addr Address of the user wallet
     *@return Value of the slope
     */
    function getLastUserSlope(address _addr) external view returns (int256) {
        uint256 uepoch = userPointEpoch[_addr];
        return userPointHistory[_addr][uepoch].slope;
    }

    /***
     *@dev Get the timestamp for checkpoint `_idx` for `_addr`
     *@param _addr User wallet address
     *@param _idx User epoch number
     *@return Epoch time of the checkpoint
     */
    function userPointHistoryTs(address _addr, uint256 _idx)
        external
        view
        returns (uint256)
    {
        return userPointHistory[_addr][_idx].ts;
    }

    /***
     *@dev Get timestamp when `_addr`'s lock finishes
     *@param _addr User wallet
     *@return Epoch time of the lock end
     */
    function lockedEnd(address _addr) external view returns (uint256) {
        return locked[_addr].end;
    }

    //Struct to avoid "Stack Too Deep"
    struct CheckpointParameters {
        Point userOldPoint;
        Point userNewPoint;
        int256 oldDslope;
        int256 newDslope;
        uint256 epoch;
    }
    /***
     *@dev Record global and per-user data to checkpoint
     *@param _addr User's wallet address. No user checkpoint if 0x0
     *@param _oldLocked Pevious locked amount / end lock time for the user
     *@param _newLocked New locked amount / end lock time for the user
     */
    function _checkpoint(
        address _addr,
        LockedBalance memory _oldLocked,
        LockedBalance memory _newLocked
    ) internal {
        CheckpointParameters memory _st;
        _st.epoch = epoch;

        // uint256 lastRewardTime = (firstDepositTime + max_reward_duration) / WEEK * WEEK;

        if (_addr != address(0)) {
            // Calculate slopes and biases
            // Kept at zero when they have to

            if (_oldLocked.end > block.timestamp && _oldLocked.amount > 0) {
                _st.userOldPoint.slope = _oldLocked.amount / int256(maxPledgeDuration);
                _st.userOldPoint.bias =
                    _st.userOldPoint.slope *
                    int256(_oldLocked.end - block.timestamp);
            }

            if (_newLocked.end > block.timestamp && _newLocked.amount > 0) {
                _st.userNewPoint.slope = _newLocked.amount / int256(maxPledgeDuration);
                _st.userNewPoint.bias =
                    _st.userNewPoint.slope *
                    int256(_newLocked.end - block.timestamp);
                
            }

            // Read values of scheduled changes in the slope
            // _oldLocked.end can be in the past and in the future
            // _newLocked.end can ONLY by in the FUTURE unless everything expired than zeros
            _st.oldDslope = slopeChanges[_oldLocked.end];
            if (_newLocked.end != 0) {
                if (_newLocked.end == _oldLocked.end) {
                    _st.newDslope = _st.oldDslope;
                } else {
                    _st.newDslope = slopeChanges[_newLocked.end];
                }
            }
        }
        Point memory _lastPoint = Point({
            bias: 0,
            slope: 0,
            ts: block.timestamp,
            blk: block.number
        });

        if (_st.epoch > 0) {
            _lastPoint = supplyPointHistory[_st.epoch];
        }
        uint256 _lastCheckPoint = _lastPoint.ts;
        // _initialLastPoint is used for extrapolation to calculate block number
        // (approximately, for *At methods) and save them
        // as we cannot figure that out exactly from inside the contract
        // Point memory _initialLastPoint = _lastPoint;
        uint256 _initBlk = _lastPoint.blk;
        uint256 _initTs = _lastPoint.ts;

        uint256 _blockSlope = 0; // dblock/dt
        if (block.timestamp > _lastPoint.ts) {
            _blockSlope =
                (MULTIPLIER * (block.number - _lastPoint.blk)) /
                (block.timestamp - _lastPoint.ts);
        }
        // If last point is already recorded in this block, slope=0
        // But that's ok b/c we know the block in such case

        // Go over weeks to fill history and calculate what the current point is
        uint256 _ti = (_lastCheckPoint / WEEK) * WEEK;
        for (uint256 i; i < 255; i++) {
            // Hopefully it won't happen that this won't get used in 5 years!
            // If it does, users will be able to withdraw but vote weight will be broken
            _ti += WEEK;
            int256 d_slope = 0;
            if (_ti > block.timestamp) {
                // reach future time, reset to blok time
                _ti = block.timestamp;
            } else {
                d_slope = slopeChanges[_ti];
            }
            _lastPoint.bias =
                _lastPoint.bias -
                _lastPoint.slope *
                int256(_ti - _lastCheckPoint);
            _lastPoint.slope += d_slope;
            
            if (_lastPoint.bias < 0) {
                // This can happen
                _lastPoint.bias = 0;
            }
            if (_lastPoint.slope < 0) {
                // This cannot happen - just in case
                _lastPoint.slope = 0;
            }
            _lastCheckPoint = _ti;
            _lastPoint.ts = _ti;
            _lastPoint.blk =
                _initBlk +
                ((_blockSlope * (_ti - _initTs)) / MULTIPLIER);
            _st.epoch += 1;
            if (_ti == block.timestamp) {
                // history filled over, break loop
                _lastPoint.blk = block.number;
                break;
            } else {
                supplyPointHistory[_st.epoch] = _lastPoint;
            }
            
        }
        epoch = _st.epoch;
        // Now supplyPointHistory is filled until t=now

        if (_addr != address(0)) {
            // If last point was in this block, the slope change has been applied already
            // But in such case we have 0 slope(s)

            _lastPoint.slope += _st.userNewPoint.slope - _st.userOldPoint.slope;
            _lastPoint.bias += _st.userNewPoint.bias - _st.userOldPoint.bias;
            
            if (_lastPoint.slope < 0) {
                _lastPoint.slope = 0;
            }
            if (_lastPoint.bias < 0) {
                _lastPoint.bias = 0;
            }
        }
        // Record the changed point into history
        supplyPointHistory[_st.epoch] = _lastPoint;
        if (_addr != address(0)) {
            // Schedule the slope changes (slope is going down)
            // We subtract new_user_slope from [_newLocked.end]
            // and add old_user_slope to [_oldLocked.end]
            if (_oldLocked.end > block.timestamp) {
                // _oldDslope was <something> - _userOldPoint.slope, so we cancel that
                _st.oldDslope += _st.userOldPoint.slope;
                if (_newLocked.end == _oldLocked.end) {
                    _st.oldDslope -= _st.userNewPoint.slope; // It was a new deposit, not extension
                }
                slopeChanges[_oldLocked.end] = _st.oldDslope;
            }
            if (_newLocked.end > block.timestamp) {
                if (_newLocked.end > _oldLocked.end) {
                    _st.newDslope -= _st.userNewPoint.slope; // old slope disappeared at this point
                    slopeChanges[_newLocked.end] = _st.newDslope;
                }
                // else we recorded it already in _oldDslope
            }

            // Now handle user history
            uint256 _userEpoch = userPointEpoch[_addr] + 1;

            userPointEpoch[_addr] = _userEpoch;
            _st.userNewPoint.ts = block.timestamp;
            _st.userNewPoint.blk = block.number;
            userPointHistory[_addr][_userEpoch] = _st.userNewPoint;

            //
        }
    }

    /***
     *@dev Deposit and lock tokens for a user
     *@param _addr User's wallet address
     *@param _value Amount to deposit
     *@param _unlockTime New time when to unlock the tokens, or 0 if unchanged
     *@param _lockedBalance Previous locked amount / timestamp
     */
    function _depositFor(
        address _provider,
        address _beneficiary,
        uint256 _value,
        uint256 _unlockTime,
        LockedBalance memory _lockedBalance,
        uint256 _type
    ) internal {
        LockedBalance memory _locked = LockedBalance(
            _lockedBalance.amount,
            _lockedBalance.end,
            _lockedBalance.ts
        );
        LockedBalance memory _oldLocked = LockedBalance(
            _lockedBalance.amount,
            _lockedBalance.end,
            _lockedBalance.ts
        );

        uint256 _supplyBefore = supply;
        supply = _supplyBefore + _value;
        //Adding to existing lock, or if a lock is expired - creating a new one
        _locked.amount = _locked.amount + int256(_value);
        if (_unlockTime != 0) {
            _locked.end = _unlockTime;
        }
        locked[_beneficiary] = _locked;

        // Possibilities
        // Both _oldLocked.end could be current or expired (>/< block.timestamp)
        // value == 0 (extend lock) or value > 0 (add to lock or extend lock)
        // _locked.end > block.timestamp (always)

        _checkpoint(_beneficiary, _oldLocked, _locked);

        if (_value != 0) {
            uint256 beforeTransNums = IERC20(getToken()).balanceOf(_provider);
            IERC20(getToken()).transferFrom(
                _provider,
                address(this),
                _value
            );
            uint256 afterTransNums = IERC20(getToken()).balanceOf(_provider);
            require(beforeTransNums-_value == afterTransNums,"Vetoken:: _depositFor No transfer in failed");
        }

        emit Deposit(
            _provider,
            _beneficiary,
            _value,
            _locked.end,
            _type,
            block.timestamp
        );
        emit Supply(_supplyBefore, _supplyBefore + _value);
    }

    /***
     *@notice Record total supply to checkpoint
     */
    function checkpointSupply() public override{
        LockedBalance memory _a;
        LockedBalance memory _b;
        _checkpoint(address(0), _a, _b);
    }

    function createLockFor(
        address _beneficiary,
        uint256 _value,
        uint256 _unlockTime
    ) external override {
        _createLock(_beneficiary, _value, _unlockTime);
    }

    function createLock(uint256 _value, uint256 _unlockTime) external override {
        _createLock(msg.sender, _value, _unlockTime);
    }

    /***
     *@dev Deposit `_value` tokens for `msg.sender` and lock until `_unlockTime`
     *@param _value Amount to deposit
     *@param _unlockTime Epoch time when tokens unlock, rounded down to whole weeks
     * nonReentrant
     */
    function _createLock(
        address _beneficiary,
        uint256 _value,
        uint256 _unlockTime
    ) internal nonReentrant{
        require(IVault(getRouter().vault()).getEntireVaultState() ==  State.NftState.freedom ,"creatLock : entire vault is freedom state");
         if(firstDepositTime == 0) {
            firstDepositTime = block.timestamp;
            IVault(getRouter().vault()).noncallable();
        }
        
        _unlockTime = (_unlockTime / WEEK) * WEEK; // Locktime is rounded down to weeks
        LockedBalance memory _locked = locked[_beneficiary];
        _locked.ts = block.timestamp;

        require(_value > 0, "Stake token number cannot be 0");
        require(_locked.amount == 0, "Please unstake previously staked tokens");
        require(
            _unlockTime > block.timestamp,
            "Staking time must end in the future"
        );
        require(
            _unlockTime >= (block.timestamp / WEEK) * WEEK + (4 * WEEK),
            "Min staking time is >= 4 weeks"
        );
        
        require(
            _unlockTime <= block.timestamp + maxPledgeDuration,
            "Cannot exceed the max staking time"
        );

        if(lastUnlockTime < _unlockTime){
            lastUnlockTime = _unlockTime;
        }

        _depositFor(
            msg.sender,
            _beneficiary,
            _value,
            _unlockTime,
            _locked,
            CREATE_LOCK_TYPE
        );
    }

    function increaseAmount(uint256 _value) external override {
        _increaseAmount(msg.sender, _value);
    }

    function increaseAmountFor(address _beneficiary, uint256 _value)
        external
        override
    {
        _increaseAmount(_beneficiary, _value);
    }

    /***
     *@dev Deposit `_value` additional tokens for `msg.sender`
     *        without modifying the unlock time
     *@param _value Amount of tokens to deposit and add to the lock
     *nonReentrant
     */
    function _increaseAmount(address _beneficiary, uint256 _value)
        internal
        nonReentrant
    {
        require(IVault(getRouter().vault()).getEntireVaultState() ==  State.NftState.freedom ,"creatLock : entire vault is freedom state");
        LockedBalance memory _locked = locked[_beneficiary];

        require(_value > 0, "Can't increase zero value");
        require(_locked.amount > 0, "No existing lock found");
        require(
            _locked.end > block.timestamp,
            "Staking deadline reached, unable to stake more"
        );

        _depositFor(
            msg.sender,
            _beneficiary,
            _value,
            0,
            _locked,
            INCREASE_LOCK_AMOUNT
        );
    }

    /***
     *@dev Extend the unlock time for `msg.sender` to `_unlockTime`
     *@param _unlockTime New epoch time for unlocking
     * nonReentrant
     */
    function increaseUnlockTime(uint256 _unlockTime)
        external
        override
        nonReentrant
    {
        require(IVault(getRouter().vault()).getEntireVaultState() ==  State.NftState.freedom ,"creatLock : entire vault is freedom state");
        LockedBalance memory _locked = locked[msg.sender];
        _unlockTime = (_unlockTime / WEEK) * WEEK; // Locktime is rounded down to weeks

        require(_locked.end > block.timestamp, "Staking deadline reached, unable to increase staking time");
        require(_locked.amount > 0, "Nothing is locked");
        require(_unlockTime > _locked.end, "Can only increase lock duration");
        require(
            _unlockTime <= block.timestamp + maxPledgeDuration,
            "Cannot exceed the maximum pledge time  "
        );

        if(lastUnlockTime < _unlockTime){
            lastUnlockTime = _unlockTime;
        }

        _depositFor(
            msg.sender,
            msg.sender,
            0,
            _unlockTime,
            _locked,
            INCREASE_UNLOCK_TIME
        );
    }

    /***
     *@dev Withdraw all tokens for `msg.sender`
     *@dev Only possible if the lock has expired
     *nonReentrant
     */
    function withdraw() external override nonReentrant{
        LockedBalance memory _locked = LockedBalance(
            locked[msg.sender].amount,
            locked[msg.sender].end,
            locked[msg.sender].ts
        );

        if(IVault(getRouter().vault()).getEntireVaultState() ==  State.NftState.freedom){
            require(block.timestamp >= _locked.end, "The lock didn't expire");
        }
        uint256 _value = uint256(_locked.amount);

        LockedBalance memory _oldLocked = LockedBalance(
            locked[msg.sender].amount,
            locked[msg.sender].end,
            locked[msg.sender].ts
        );

        _locked.end = 0;
        _locked.amount = 0;
        _locked.ts = 0;
        locked[msg.sender] = _locked;
        uint256 _supplyBefore = supply;
        supply = _supplyBefore - _value;

        // _oldLocked can have either expired <= timestamp or zero end
        // _locked has only 0 end
        // Both can have >= 0 amount
        _checkpoint(msg.sender, _oldLocked, _locked);

        if(_value > 0){
            uint256 beforeTokens = IERC20(getToken()).balanceOf(msg.sender);
            IERC20(getToken()).transfer(msg.sender, _value);
            require(beforeTokens - _value == IERC20(getToken()).balanceOf(msg.sender),"vetoken:: withdraw No transfer in failed");
            emit Withdraw(msg.sender,_value,block.timestamp);
            emit Supply(_supplyBefore, _supplyBefore - _value);
        }
        
    }

    // The following ERC20/minime-compatible methods are not real balanceOf and supply!
    // They measure the weights for the purpose of voting, so they don't represent
    // real coins.

    /***
     *@dev Binary search to estimate timestamp for block number
     *@param _block Block to find
     *@param _max_epoch Don't go beyond this epoch
     *@return Approximate timestamp for block
     */
    function findBlockEpoch(uint256 _block, uint256 _max_epoch)
        internal
        view
        returns (uint256)
    {
        // Binary search
        uint256 _min = 0;
        uint256 _max = _max_epoch;
        for (uint256 i; i <= 128; i++) {
            // Will be always enough for 128-bit numbers
            if (_min >= _max) {
                break;
            }
            uint256 _mid = (_min + _max + 1) / 2;
            if (supplyPointHistory[_mid].blk <= _block) {
                _min = _mid;
            } else {
                _max = _mid - 1;
            }
        }
        return _min;
    }

    /***
     *@notice Get the current voting power for `msg.sender`
     *@dev Adheres to the ERC20 `balanceOf` interface for Metamask & Snapshot compatibility
     *@param _addr User wallet address
     *@return User's present voting power
     */
 
    function userOfEquity(address _addr) external override view returns (uint256) {
        return userOfEquityAndTime(_addr,block.timestamp);
    }

    /***
     *@notice Get the current voting power for `msg.sender`
     *@dev Adheres to the ERC20 `balanceOf` interface for Aragon compatibility
     *@param _addr User wallet address
     *@param _t Epoch time to return voting power at
     *@return User voting power
     *@dev return the present voting power if _t is 0
     */
    function userOfEquityAndTime(address _addr, uint256 _t)
        public
        view
        returns (uint256)
    {
        if (_t == 0) {
            _t = block.timestamp;
        }

        uint256 _epoch = userPointEpoch[_addr];
        if (_epoch == 0) {
            return 0;
        } else {
            Point memory _lastPoint = userPointHistory[_addr][_epoch];
            _lastPoint.bias -= _lastPoint.slope * int256(_t - _lastPoint.ts);
            if (_lastPoint.bias < 0) {
                _lastPoint.bias = 0;
            }
            return uint256(_lastPoint.bias);
        }
    }

    //Struct to avoid "Stack Too Deep"
    struct Parameters {
        uint256 min;
        uint256 max;
        uint256 maxEpoch;
        uint256 dBlock;
        uint256 dt;
    }

    /***
     *@notice Measure voting power of `_addr` at block height `_block`
     *@dev Adheres to MiniMe `balanceOfAt` interface https//github.com/Giveth/minime
     *@param _addr User's wallet address
     *@param _block Block to calculate the voting power at
     *@return Voting power
     */
    function balanceOfAt(address _addr, uint256 _block)
        external
        view
        returns (uint256)
    {
        // Copying and pasting totalSupply code because Vyper cannot pass by
        // reference yet
        require(_block <= block.number, "Can't exceed lasted block");

        Parameters memory _st;

        // Binary search
        _st.min = 0;
        _st.max = userPointEpoch[_addr];

        for (uint256 i; i <= 128; i++) {
            // Will be always enough for 128-bit numbers
            if (_st.min >= _st.max) {
                break;
            }
            uint256 _mid = (_st.min + _st.max + 1) / 2;
            if (userPointHistory[_addr][_mid].blk <= _block) {
                _st.min = _mid;
            } else {
                _st.max = _mid - 1;
            }
        }
        Point memory _upoint = userPointHistory[_addr][_st.min];

        _st.maxEpoch = epoch;
        uint256 _epoch = findBlockEpoch(_block, _st.maxEpoch);
        Point memory _point = supplyPointHistory[_epoch];
        _st.dBlock = 0;
        _st.dt = 0;
        if (_epoch < _st.maxEpoch) {
            Point memory _point_1 = supplyPointHistory[_epoch + 1];
            _st.dBlock = _point_1.blk - _point.blk;
            _st.dt = _point_1.ts - _point.ts;
        } else {
            _st.dBlock = block.number - _point.blk;
            _st.dt = block.timestamp - _point.ts;
        }
        uint256 block_time = _point.ts;
        if (_st.dBlock != 0) {
            block_time += (_st.dt * (_block - _point.blk)) / _st.dBlock;
        }

        _upoint.bias -= _upoint.slope * int256(block_time - _upoint.ts);
        if (_upoint.bias >= 0) {
            return uint256(_upoint.bias);
        } else {
            return 0;
        }
    }

    /***
     *@dev Calculate total voting power at some point in the past
     *@param point The point (bias/slope) to start search from
     *@param t Time to calculate the total voting power at
     *@return Total voting power at that time
     */
    function supplyAt(Point memory point, uint256 t)
        internal
        view
        returns (uint256)
    {
        Point memory _lastPoint = point;
        uint256 _ti = (_lastPoint.ts / WEEK) * WEEK;
        for (uint256 i; i < 255; i++) {
            _ti += WEEK;
            int256 d_slope = 0;

            if (_ti > t) {
                _ti = t;
            } else {
                d_slope = slopeChanges[_ti];
            }
            _lastPoint.bias -= _lastPoint.slope * int256(_ti - _lastPoint.ts);

            if (_ti == t) {
                break;
            }
            _lastPoint.slope += d_slope;
            _lastPoint.ts = _ti;
        }

        if (_lastPoint.bias < 0) {
            _lastPoint.bias = 0;
        }
        return uint256(_lastPoint.bias);
    }

    /***
     *@notice Calculate total voting power
     *@dev Adheres to the ERC20 `totalSupply` interface for Aragon compatibility
     *@return Total voting power
     */
    function totalSupply() external override view returns (uint256) {
        uint256 _epoch = epoch;
        Point memory _lastPoint = supplyPointHistory[_epoch];

        return supplyAt(_lastPoint, block.timestamp);
    }

    /***
     *@notice Calculate total voting power
     *@dev Adheres to the ERC20 `totalSupply` interface for Aragon compatibility
     *@return Total voting power
     */
    function totalSupply(uint256 _t) external view returns (uint256) {
        if (_t == 0) {
            _t = block.timestamp;
        }

        uint256 _epoch = epoch;
        Point memory _lastPoint = supplyPointHistory[_epoch];

        return supplyAt(_lastPoint, _t);
    }

    /***
     *@notice Calculate total voting power at some point in the past
     *@param _block Block to calculate the total voting power at
     *@return Total voting power at `_block`
     */
    function totalSupplyAt(uint256 _block) external view returns (uint256) {
        require(_block <= block.number, "Can't exceed the latest block");
        uint256 _epoch = epoch;
        uint256 _targetEpoch = findBlockEpoch(_block, _epoch);

        Point memory _point = supplyPointHistory[_targetEpoch];
        uint256 dt = 0;
        if (_targetEpoch < _epoch) {
            Point memory _pointNext = supplyPointHistory[_targetEpoch + 1];
            if (_point.blk != _pointNext.blk) {
                dt =
                    ((_block - _point.blk) * (_pointNext.ts - _point.ts)) /
                    (_pointNext.blk - _point.blk);
            }
        } else {
            if (_point.blk != block.number) {
                dt =
                    ((_block - _point.blk) * (block.timestamp - _point.ts)) /
                    (block.number - _point.blk);
            }
        }
        // Now dt contains info on how far are we beyond point

        return supplyAt(_point, _point.ts + dt);
    }

    function getLinearWeeklyRelease() public override view returns(uint256){
        return _calLinearReleaseReward(0);
    }

    function _calLinearReleaseReward(uint256 totalReward_) private view returns(uint256){
        if(maxRewardDuration == 0) return 0;
        if(totalReward_ > 0){
            return totalReward_/maxRewardDuration;
        }else{
            return totalReward/maxRewardDuration;
        }
    }
    function claim() external nonReentrant returns (uint256) {
        if(maxRewardDuration == 0) return 0;

        address _sender = msg.sender;
        if (block.timestamp >= timeCursor) {
            _checkpointTotalSupply();
        }

        Claimable memory _st_claimable = _claimable(
            _sender,
            block.timestamp
        );
        uint256 amount = _st_claimable.amount;
        userEpochOf[_sender] = _st_claimable.userEpoch;
        timeCursorOf[_sender] = _st_claimable.weekCursor;
       
        if (amount != 0) {
            uint256 surplusReward = totalReward - totalClaimedReward;
            if(surplusReward >0 && surplusReward >= amount){
                IDivision(getToken()).mintDivision(_sender, amount);
                totalClaimedReward += amount;
            }else{
                revert("Vetoken: Vetoken has insufficient balance!");
            }

            totalClaimed[_sender] += amount;

            emit Claimed(
                _sender,
                amount,
                _st_claimable.userEpoch,
                _st_claimable.maxUserEpoch,
                address(getToken())
            );
        }

        return amount;
    }

    function _checkpointTotalSupply() public {
        if(firstDepositTime > 0){
            uint256 t = timeCursor;
            uint256 roundedTimestamp = (block.timestamp / WEEK) * WEEK;
            uint256 _maxRewardTimeWeek = (firstDepositTime + maxRewardDuration)/WEEK * WEEK;
            checkpointSupply();
            for (uint256 i = 0; i < 52; i++) {
                if (t > roundedTimestamp || t>=_maxRewardTimeWeek) {
                    break;
                } else {
                    veSupply[t] = 0;
                    uint256 _tepoch = _findTimestampEpoch(t);
                    Point memory pt = supplyPointHistory[_tepoch];
                    int256 dt = 0;
                    if (t > pt.ts) {
                        // If the point is at 0 epoch, it can actually be earlier than the first deposit
                        // Then make dt 0
                        dt = int256(t - pt.ts);
                    }else if(pt.ts > t && pt.ts-t <= WEEK){ // locket less week
                        uint256 tempBias = uint(pt.bias) - ((pt.ts/WEEK+1) * WEEK - pt.ts) * uint(pt.slope);
                        veSupply[t] = tempBias;
                    }
                    
            
                    int256 _veSupply = pt.bias - pt.slope * dt;
                    
                    if (_veSupply > 0) {
                        veSupply[t] = uint256(_veSupply);
                    }
                }
                t += WEEK;
            }
            timeCursor = t;
        }
    }


    function _findTimestampEpoch(uint256 _timestamp)
        internal
        view
        returns (uint256)
    {
        uint256 _min = 0;
        uint256 _max = epoch;
        for (uint256 i = 0; i < 128; i++) {
            if (_min >= _max) {
                break;
            }
            uint256 _mid = (_min + _max + 2) / 2;
            Point memory pt = supplyPointHistory[_mid];
            if (pt.ts <= _timestamp) {
                _min = _mid;
            } else {
                _max = _mid - 1;
            }
        }
        return _min;
    }
    function _claimable(address _addr, uint256 _lastDistributeTime)
        internal
        view
        returns (Claimable memory)
    {
        uint256 _firstDepositTime = firstDepositTime;
        if(_firstDepositTime == 0) {
            return Claimable(0, 0, 0, 0);
        }
        if(_lastDistributeTime == 0) _lastDistributeTime = block.timestamp;

        uint256 roundedTimestamp = (_lastDistributeTime / WEEK) * WEEK;
        uint256 userEpoch = 0;
        uint256 toDistribute = 0;
        uint256 maxUserEpoch = userPointEpoch[_addr];

        if (maxUserEpoch == 0) {
            // No lock = no fees

            return Claimable(0, 0, 0, 0);
        }
        uint256 weekCursor = timeCursorOf[_addr];
        if (weekCursor == 0) {
            // Need to do the initial binary search
            userEpoch = _findTimestampUserEpoch(_addr, startTime, maxUserEpoch);
        } else {
            userEpoch = userEpochOf[_addr];
        }

        if (userEpoch == 0) {
            userEpoch = 1;
        }
        Point memory userPoint = userPointHistory[_addr][userEpoch];
        if (weekCursor == 0) {
            weekCursor = ((userPoint.ts + WEEK - 1) / WEEK) * WEEK;
        }
        if (weekCursor > roundedTimestamp) {
            return Claimable(0, userEpoch, maxUserEpoch, weekCursor);
        }
        
        if (weekCursor < startTime) {
            weekCursor = startTime;
        }
       
        Point memory oldUserPoint;

        uint256 _maxRewardTimeWeek = (firstDepositTime + maxRewardDuration)/WEEK * WEEK;
        // Iterate over weeks
        for (uint256 i = 0; i < 52; i++) {
            if (weekCursor > roundedTimestamp) {
                break;
            }
            if (weekCursor >= userPoint.ts && userEpoch <= maxUserEpoch) {
                userEpoch += 1;
                oldUserPoint = userPoint;
                if (userEpoch > maxUserEpoch) {
                    Point memory emptyPoint;
                    userPoint = emptyPoint;
                } else {
                    userPoint = userPointHistory[_addr][userEpoch];
                }
                
            } else {
                int256 dt = int256(weekCursor - oldUserPoint.ts);
                int256 _balanceOf = oldUserPoint.bias - dt * oldUserPoint.slope;
                uint256 _tbalanceOf = 0;
                if (_balanceOf > 0) {
                    _tbalanceOf = uint256(_balanceOf);
                }
                uint256 _veSupply = veSupply[weekCursor];
                if(dt>0){
                    // Make up the last week
                    // if(weekCursor == _maxRewardTimeWeek && uint256(oldUserPoint.bias) - (uint256(dt)-1) * uint256(oldUserPoint.slope) > 0 ){
                    if(weekCursor == _maxRewardTimeWeek-WEEK && oldUserPoint.bias - (dt-1) * oldUserPoint.slope > 0 ){
                        uint _preWeekBalanceOf = uint(oldUserPoint.bias) - (weekCursor-WEEK - oldUserPoint.ts) * uint(oldUserPoint.slope);
                        toDistribute += _preWeekBalanceOf * getLinearWeeklyRelease() * uint256(WEEK)/veSupply[weekCursor-WEEK];
                    }
                }
                if (_tbalanceOf == 0 && userEpoch > maxUserEpoch) {
                    break;
                }
                
                if (_tbalanceOf > 0 && _veSupply > 0) {
                    if(dt>0){
                        toDistribute += _tbalanceOf * getLinearWeeklyRelease() * uint256(WEEK)/_veSupply;
                    }
                }
                weekCursor += WEEK;
            }
        }

        userEpoch = maxUserEpoch < userEpoch - 1 ? maxUserEpoch : userEpoch - 1 ;
        return Claimable(toDistribute, userEpoch, maxUserEpoch, weekCursor);
    }

    function claimableToken(address _addr) external view returns (uint256) {
        return _claimable(_addr, block.timestamp).amount;
    }

    function _findTimestampUserEpoch(
        address _user,
        uint256 _timestamp,
        uint256 _maxUserEpoch
    ) public view returns (uint256) {
        uint256 _min = 0;
        uint256 _max = _maxUserEpoch;
        for (uint256 i = 0; i < 128; i++) {
            if (_min >= _max) {
                break;
            }
            uint256 _mid = (_min + _max + 2) / 2;
            Point memory pt = userPointHistory[_user][_mid];
            if (pt.ts <= _timestamp) {
                _min = _mid;
            } else {
                _max = _mid - 1;
            }
        }
        return _min;
    }

    function totalClaimable() external override view returns(uint256){
        if(maxRewardDuration == 0) return 0;
        return _calTotalUnClaimedReward();
    }

    function _calPure(uint256 dt_) private view returns (uint256){
        if(dt_ > dt_/WEEK * WEEK) {
            return WEEK * (dt_/WEEK +1);
        }else{
            return dt_;
        }
    }
    function _calTotalUnClaimedReward()  private view returns(uint256){
        uint256 _lastUnlockTime = lastUnlockTime;
        uint256 _firstDepositTime = firstDepositTime;
        uint256 _startAuctionTime = startAuctionTime;
        uint256 _maxRewardTime = _firstDepositTime + maxRewardDuration;
        uint256 _dt = 0;
        uint256 totalUnClaimNum = 0;
        if(_firstDepositTime == 0) return 0;

        uint256 rewardWeeks = maxRewardDuration/WEEK;

        if(IVault(getRouter().vault()).getEntireVaultState() != State.NftState.freedom){
            uint256 _tempRewardWeeks = (_startAuctionTime - _firstDepositTime)/WEEK ;
            rewardWeeks = _tempRewardWeeks/WEEK > rewardWeeks ? rewardWeeks : _tempRewardWeeks;
        }

        uint256 perWeekRewards = getLinearWeeklyRelease() * WEEK;
        uint totalClaimedRewardNums = rewardWeeks * perWeekRewards;

        if(oldChangesTotalReward.length > 0){
            //changes before reward week num
            uint256[] memory splitBeforeWeeks = new uint256[](oldChangesTotalReward.length);
            uint256[] memory splitBeforeTotalRewards = new uint256[](oldChangesTotalReward.length);
            rewardWeeks = 0;
            totalClaimedRewardNums = 0;
            for(uint256 i=0;i < oldChangesTotalReward.length;i++){
                if(i==0){
                    if(_startAuctionTime >= oldChangesTotalReward[i].ts){
                        splitBeforeWeeks[i] = (oldChangesTotalReward[i].ts - _firstDepositTime)/WEEK;
                        splitBeforeTotalRewards[i] = oldChangesTotalReward[i].beforeTotalReward;
                    }else{
                        splitBeforeWeeks[i] = (_startAuctionTime - _firstDepositTime)/WEEK;
                        splitBeforeTotalRewards[i] = oldChangesTotalReward[i].beforeTotalReward;
                        break;
                    }
                }else{
                    if(_startAuctionTime >= oldChangesTotalReward[i].ts){
                        splitBeforeWeeks[i] = (oldChangesTotalReward[i].ts - oldChangesTotalReward[i-1].ts)/WEEK;
                        splitBeforeTotalRewards[i] = oldChangesTotalReward[i-1].beforeTotalReward;
                    }else{
                        splitBeforeWeeks[i] = (_startAuctionTime - oldChangesTotalReward[i-1].ts)/WEEK;
                        splitBeforeTotalRewards[i] = oldChangesTotalReward[i].beforeTotalReward;
                        break;
                    }
                }
            }

            if(splitBeforeWeeks.length>0){
                for(uint256 j=0;j< splitBeforeWeeks.length;j++){
                    //Maxrewardduration needs improvement if it changes in the future
                    totalClaimedRewardNums += (splitBeforeTotalRewards[j] * splitBeforeWeeks[j]) /  maxRewardDuration;
                }
            }
            
        }
        return totalClaimedRewardNums - totalClaimedReward;
    }

    function getRouter() private view returns(IRouterData) {
        return IRouterData(router);
    }

    function updateMaxPledgeDuration(uint256 _maxPledgeDuration) external override isWhiteList{
        // maxPledgeDuration = maxPledgeDuration + _maxPledgeDuration;
    }

    function updateMaxRewardDuration(uint256 _maxRewardDuration) external override isWhiteList{
        // maxRewardDuration = maxRewardDuration + _maxRewardDuration;
    }

    function appendTotalReward(uint256 _addReward) external override isWhiteList{
        totalReward =  totalReward + _addReward;
        oldChangesTotalReward.push(ChangesTotalReward({changeUser:msg.sender,beforeTotalReward:totalReward,ts:block.timestamp}));
    }

    function stopReward() external override isWhiteList{
        _checkpointTotalSupply();
        oldChangesTotalReward.push(ChangesTotalReward({changeUser:msg.sender,beforeTotalReward:totalReward,ts:block.timestamp}));
        
        // totalReward =  0;
        startAuctionTime = block.timestamp;
    }
    function updateVeToken(address _updataTemplate) external isWhiteList{
        require(_updataTemplate != address(0),"_updataTemplate is zero address");
        (bool _ok, bytes memory returnData) = _updataTemplate.delegatecall(abi.encodeWithSignature(
            "updateVeTokenUtils()"
        ));

        require(_ok, string(returnData));
    }
}
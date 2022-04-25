// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/INFTXVaultFactory.sol";
import "./interfaces/INFTXVault.sol";
import "./interfaces/IERC3156Upgradeable.sol";
import "./IClaim.sol";

import "hardhat/console.sol";

contract Hunter is IERC3156FlashBorrower, IERC721Receiver {
    bytes32 private constant RETURN_VALUE =
        keccak256("ERC3156FlashBorrower.onFlashLoan");

    INFTXVaultFactory public factory;

    struct FlashLoanParams {
        address nft;
        uint amount;
        address claim;
        uint[] ids;
    }

    struct FlashLoanCallbackParams {
        address nft;
        address claim;
        address vault;
        uint amount;
        uint[] ids;
    }

    constructor(address _factory) {
        factory = INFTXVaultFactory(_factory);
    }

    function initFlashLoan(FlashLoanParams memory params) external {
        require(!factory.isLocked(4), "flashloan locked");
        address[] memory addrs = factory.vaultsForAsset(params.nft);
        address token = addrs[0];
        IERC3156FlashLenderUpgradeable lender = IERC3156FlashLenderUpgradeable(
            token
        );

        lender.flashLoan(
            IERC3156FlashBorrowerUpgradeable(address(this)),
            token,
            params.amount * 10**18,
            abi.encode(
                FlashLoanCallbackParams({
                    nft: params.nft,
                    claim: params.claim,
                    amount: params.amount,
                    vault: token,
                    ids: params.ids
                })
            )
        );
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint amount,
        uint fee,
        bytes memory data
    ) external override returns (bytes32) {
        console.log("onFlashLoan called");
        FlashLoanCallbackParams memory params = abi.decode(
            data,
            (FlashLoanCallbackParams)
        );
        console.log(IERC20(params.vault).balanceOf(address(this)));
        INFTXVault vault = INFTXVault(params.vault);
        uint[] memory ids = vault.redeem(params.amount, params.ids);
        uint[] memory amounts;
        uint apes = IClaim(params.claim).getClaimableTokenAmount(address(this));
        console.log("------");
        console.log(apes);
        console.log("------");
        for (uint i = 0; i < ids.length; i++) {
            IClaim(params.claim).claimTokens();
            IERC721(params.nft).approve(address(vault), ids[i]);
        }
        console.log("claimed");
        vault.mint(ids, amounts);
        IERC20(params.vault).approve(msg.sender, amount + fee);
        return RETURN_VALUE;
    }

    function onERC721Received(
        address operator,
        address from,
        uint tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        console.log(
            string(abi.encodePacked("received", tokenId, "from", from))
        );
        return IERC721Receiver.onERC721Received.selector;
    }
}

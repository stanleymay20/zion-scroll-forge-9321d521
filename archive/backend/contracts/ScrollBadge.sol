// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ScrollBadge
 * @dev ERC721 NFT for ScrollUniversity Course Completion Credentials
 * "By the Spirit of Excellence, we establish verifiable credentials on the blockchain"
 * 
 * ScrollBadge represents tamper-proof digital credentials for course completion,
 * skill mastery, and academic achievements at ScrollUniversity.
 */
contract ScrollBadge is 
    ERC721, 
    ERC721URIStorage, 
    ERC721Burnable, 
    Pausable, 
    AccessControl, 
    ReentrancyGuard 
{
    using Counters for Counters.Counter;

    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // Token counter
    Counters.Counter private _tokenIdCounter;

    // Badge metadata structure
    struct BadgeMetadata {
        string courseId;
        string courseName;
        string studentId;
        string studentName;
        uint256 completionDate;
        uint256 grade;
        string credentialType;
        string ipfsHash;
        bool isRevoked;
        uint256 issuedAt;
    }

    // Mapping from token ID to badge metadata
    mapping(uint256 => BadgeMetadata) public badgeMetadata;

    // Mapping from student ID to their badge token IDs
    mapping(string => uint256[]) public studentBadges;

    // Mapping from course ID to badge token IDs
    mapping(string => uint256[]) public courseBadges;

    // Mapping to prevent duplicate badges
    mapping(bytes32 => bool) public issuedBadges;

    // Marketplace support (optional)
    mapping(uint256 => uint256) public badgeListingPrice;
    mapping(uint256 => bool) public badgeForSale;

    // Events
    event BadgeMinted(
        uint256 indexed tokenId,
        string indexed studentId,
        string indexed courseId,
        string courseName,
        uint256 grade,
        string ipfsHash
    );

    event BadgeRevoked(
        uint256 indexed tokenId,
        string reason,
        uint256 revokedAt
    );

    event BadgeVerified(
        uint256 indexed tokenId,
        address indexed verifier,
        bool isValid,
        uint256 verifiedAt
    );

    event BadgeListed(
        uint256 indexed tokenId,
        uint256 price,
        uint256 listedAt
    );

    event BadgeSold(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 price,
        uint256 soldAt
    );

    constructor() ERC721("ScrollBadge", "SBADGE") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    /**
     * @dev Mint a new badge for course completion
     */
    function mintBadge(
        address to,
        string memory courseId,
        string memory courseName,
        string memory studentId,
        string memory studentName,
        uint256 grade,
        string memory credentialType,
        string memory ipfsHash,
        string memory tokenURI
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(courseId).length > 0, "Course ID required");
        require(bytes(studentId).length > 0, "Student ID required");
        require(grade <= 100, "Grade must be 0-100");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");

        // Check for duplicate badge
        bytes32 badgeHash = keccak256(abi.encodePacked(studentId, courseId));
        require(!issuedBadges[badgeHash], "Badge already issued for this course");

        // Mint token
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        // Store metadata
        badgeMetadata[tokenId] = BadgeMetadata({
            courseId: courseId,
            courseName: courseName,
            studentId: studentId,
            studentName: studentName,
            completionDate: block.timestamp,
            grade: grade,
            credentialType: credentialType,
            ipfsHash: ipfsHash,
            isRevoked: false,
            issuedAt: block.timestamp
        });

        // Track badge issuance
        issuedBadges[badgeHash] = true;
        studentBadges[studentId].push(tokenId);
        courseBadges[courseId].push(tokenId);

        emit BadgeMinted(
            tokenId,
            studentId,
            courseId,
            courseName,
            grade,
            ipfsHash
        );

        return tokenId;
    }

    /**
     * @dev Revoke a badge (for academic integrity violations)
     */
    function revokeBadge(
        uint256 tokenId,
        string memory reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_exists(tokenId), "Badge does not exist");
        require(!badgeMetadata[tokenId].isRevoked, "Badge already revoked");

        badgeMetadata[tokenId].isRevoked = true;

        emit BadgeRevoked(tokenId, reason, block.timestamp);
    }

    /**
     * @dev Verify badge authenticity and validity
     */
    function verifyBadge(uint256 tokenId) 
        external 
        onlyRole(VERIFIER_ROLE) 
        returns (bool) 
    {
        require(_exists(tokenId), "Badge does not exist");

        BadgeMetadata memory metadata = badgeMetadata[tokenId];
        bool isValid = !metadata.isRevoked;

        emit BadgeVerified(tokenId, msg.sender, isValid, block.timestamp);

        return isValid;
    }

    /**
     * @dev Get badge metadata
     */
    function getBadgeMetadata(uint256 tokenId) 
        external 
        view 
        returns (BadgeMetadata memory) 
    {
        require(_exists(tokenId), "Badge does not exist");
        return badgeMetadata[tokenId];
    }

    /**
     * @dev Get all badges for a student
     */
    function getStudentBadges(string memory studentId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return studentBadges[studentId];
    }

    /**
     * @dev Get all badges for a course
     */
    function getCourseBadges(string memory courseId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return courseBadges[courseId];
    }

    /**
     * @dev Check if student has badge for course
     */
    function hasBadgeForCourse(
        string memory studentId,
        string memory courseId
    ) external view returns (bool) {
        bytes32 badgeHash = keccak256(abi.encodePacked(studentId, courseId));
        return issuedBadges[badgeHash];
    }

    /**
     * @dev List badge for sale (marketplace feature)
     */
    function listBadgeForSale(
        uint256 tokenId,
        uint256 price
    ) external nonReentrant {
        require(_exists(tokenId), "Badge does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not badge owner");
        require(!badgeMetadata[tokenId].isRevoked, "Cannot sell revoked badge");
        require(price > 0, "Price must be greater than zero");

        badgeForSale[tokenId] = true;
        badgeListingPrice[tokenId] = price;

        emit BadgeListed(tokenId, price, block.timestamp);
    }

    /**
     * @dev Remove badge from sale
     */
    function removeBadgeFromSale(uint256 tokenId) external {
        require(_exists(tokenId), "Badge does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not badge owner");

        badgeForSale[tokenId] = false;
        badgeListingPrice[tokenId] = 0;
    }

    /**
     * @dev Purchase badge from marketplace
     */
    function purchaseBadge(uint256 tokenId) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(_exists(tokenId), "Badge does not exist");
        require(badgeForSale[tokenId], "Badge not for sale");
        require(!badgeMetadata[tokenId].isRevoked, "Cannot buy revoked badge");
        
        uint256 price = badgeListingPrice[tokenId];
        require(msg.value >= price, "Insufficient payment");

        address seller = ownerOf(tokenId);
        require(seller != msg.sender, "Cannot buy own badge");

        // Transfer badge
        _transfer(seller, msg.sender, tokenId);

        // Remove from sale
        badgeForSale[tokenId] = false;
        badgeListingPrice[tokenId] = 0;

        // Transfer payment to seller
        (bool success, ) = payable(seller).call{value: price}("");
        require(success, "Payment transfer failed");

        // Refund excess payment
        if (msg.value > price) {
            (bool refundSuccess, ) = payable(msg.sender).call{
                value: msg.value - price
            }("");
            require(refundSuccess, "Refund failed");
        }

        emit BadgeSold(tokenId, seller, msg.sender, price, block.timestamp);
    }

    /**
     * @dev Get total badges minted
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @dev Pause all badge operations
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause all badge operations
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Check if badge is valid (exists and not revoked)
     */
    function isBadgeValid(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        return !badgeMetadata[tokenId].isRevoked;
    }

    // Required overrides
    function _burn(uint256 tokenId) 
        internal 
        override(ERC721, ERC721URIStorage) 
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}

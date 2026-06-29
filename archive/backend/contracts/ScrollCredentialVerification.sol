// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ScrollCredentialVerification
 * @dev Smart contract for verifying ScrollUniversity credentials on blockchain
 * "By the Spirit of Truth, we establish immutable records of educational achievement"
 */
contract ScrollCredentialVerification is AccessControl, ReentrancyGuard {
    using ECDSA for bytes32;

    // Role definitions
    bytes32 public constant ACCREDITATION_AUTHORITY_ROLE = keccak256("ACCREDITATION_AUTHORITY_ROLE");
    bytes32 public constant PROPHETIC_VALIDATOR_ROLE = keccak256("PROPHETIC_VALIDATOR_ROLE");
    bytes32 public constant DATA_SCIENCE_VALIDATOR_ROLE = keccak256("DATA_SCIENCE_VALIDATOR_ROLE");
    bytes32 public constant INSTITUTION_ROLE = keccak256("INSTITUTION_ROLE");

    // Credential types
    enum CredentialType {
        SCROLL_TRANSCRIPT,
        DSGEI_DEGREE,
        B_SCROLL_CERTIFICATION,
        COURSE_COMPLETION,
        RESEARCH_PUBLICATION,
        INNOVATION_CERTIFICATE
    }

    // Credential status
    enum CredentialStatus {
        ACTIVE,
        EXPIRED,
        REVOKED,
        SUSPENDED
    }

    // Validation status for joint validation
    enum ValidationStatus {
        PENDING,
        PROPHETIC_APPROVED,
        DATA_SCIENCE_APPROVED,
        BOTH_APPROVED,
        REJECTED
    }

    // Credential structure
    struct Credential {
        string credentialId;
        address studentAddress;
        string institutionId;
        CredentialType credentialType;
        CredentialStatus status;
        string ipfsHash;
        uint256 issueDate;
        uint256 expiryDate;
        ValidationStatus validationStatus;
        address propheticValidator;
        address dataScienceValidator;
        string metadata;
    }

    // Accreditation record structure
    struct AccreditationRecord {
        string institutionId;
        bool isAccredited;
        uint256 accreditationDate;
        uint256 expiryDate;
        string certificateHash;
        ValidationStatus validationStatus;
        address[] propheticValidators;
        address[] dataScienceValidators;
    }

    // Storage
    mapping(string => Credential) public credentials;
    mapping(string => AccreditationRecord) public accreditationRecords;
    mapping(address => string[]) public studentCredentials;
    mapping(string => string[]) public institutionCredentials;
    
    // Validation tracking
    mapping(string => mapping(address => bool)) public propheticValidations;
    mapping(string => mapping(address => bool)) public dataScienceValidations;

    // Events
    event CredentialIssued(
        string indexed credentialId,
        address indexed studentAddress,
        string institutionId,
        CredentialType credentialType
    );

    event CredentialValidated(
        string indexed credentialId,
        address indexed validator,
        string validatorType,
        ValidationStatus newStatus
    );

    event CredentialRevoked(
        string indexed credentialId,
        address indexed revokedBy,
        string reason
    );

    event AccreditationGranted(
        string indexed institutionId,
        uint256 expiryDate,
        string certificateHash
    );

    event AccreditationRevoked(
        string indexed institutionId,
        address indexed revokedBy,
        string reason
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ACCREDITATION_AUTHORITY_ROLE, msg.sender);
    }

    /**
     * @dev Issue a new credential (requires joint validation for degrees)
     */
    function issueCredential(
        string memory _credentialId,
        address _studentAddress,
        string memory _institutionId,
        CredentialType _credentialType,
        string memory _ipfsHash,
        uint256 _expiryDate,
        string memory _metadata
    ) external onlyRole(INSTITUTION_ROLE) nonReentrant {
        require(bytes(_credentialId).length > 0, "Invalid credential ID");
        require(_studentAddress != address(0), "Invalid student address");
        require(accreditationRecords[_institutionId].isAccredited, "Institution not accredited");
        require(credentials[_credentialId].issueDate == 0, "Credential already exists");

        ValidationStatus initialStatus = ValidationStatus.PENDING;
        
        // Course completions don't require joint validation
        if (_credentialType == CredentialType.COURSE_COMPLETION) {
            initialStatus = ValidationStatus.BOTH_APPROVED;
        }

        credentials[_credentialId] = Credential({
            credentialId: _credentialId,
            studentAddress: _studentAddress,
            institutionId: _institutionId,
            credentialType: _credentialType,
            status: CredentialStatus.ACTIVE,
            ipfsHash: _ipfsHash,
            issueDate: block.timestamp,
            expiryDate: _expiryDate,
            validationStatus: initialStatus,
            propheticValidator: address(0),
            dataScienceValidator: address(0),
            metadata: _metadata
        });

        studentCredentials[_studentAddress].push(_credentialId);
        institutionCredentials[_institutionId].push(_credentialId);

        emit CredentialIssued(_credentialId, _studentAddress, _institutionId, _credentialType);
    }

    /**
     * @dev Prophetic validation of credential
     */
    function propheticValidation(
        string memory _credentialId,
        bool _approved
    ) external onlyRole(PROPHETIC_VALIDATOR_ROLE) {
        require(credentials[_credentialId].issueDate > 0, "Credential does not exist");
        require(!propheticValidations[_credentialId][msg.sender], "Already validated by this prophet");

        propheticValidations[_credentialId][msg.sender] = true;
        credentials[_credentialId].propheticValidator = msg.sender;

        if (_approved) {
            if (credentials[_credentialId].validationStatus == ValidationStatus.DATA_SCIENCE_APPROVED) {
                credentials[_credentialId].validationStatus = ValidationStatus.BOTH_APPROVED;
            } else {
                credentials[_credentialId].validationStatus = ValidationStatus.PROPHETIC_APPROVED;
            }
        } else {
            credentials[_credentialId].validationStatus = ValidationStatus.REJECTED;
            credentials[_credentialId].status = CredentialStatus.SUSPENDED;
        }

        emit CredentialValidated(_credentialId, msg.sender, "PROPHETIC", credentials[_credentialId].validationStatus);
    }

    /**
     * @dev Data science validation of credential
     */
    function dataScienceValidation(
        string memory _credentialId,
        bool _approved
    ) external onlyRole(DATA_SCIENCE_VALIDATOR_ROLE) {
        require(credentials[_credentialId].issueDate > 0, "Credential does not exist");
        require(!dataScienceValidations[_credentialId][msg.sender], "Already validated by this data scientist");

        dataScienceValidations[_credentialId][msg.sender] = true;
        credentials[_credentialId].dataScienceValidator = msg.sender;

        if (_approved) {
            if (credentials[_credentialId].validationStatus == ValidationStatus.PROPHETIC_APPROVED) {
                credentials[_credentialId].validationStatus = ValidationStatus.BOTH_APPROVED;
            } else {
                credentials[_credentialId].validationStatus = ValidationStatus.DATA_SCIENCE_APPROVED;
            }
        } else {
            credentials[_credentialId].validationStatus = ValidationStatus.REJECTED;
            credentials[_credentialId].status = CredentialStatus.SUSPENDED;
        }

        emit CredentialValidated(_credentialId, msg.sender, "DATA_SCIENCE", credentials[_credentialId].validationStatus);
    }

    /**
     * @dev Grant accreditation to an institution
     */
    function grantAccreditation(
        string memory _institutionId,
        uint256 _expiryDate,
        string memory _certificateHash,
        address[] memory _propheticValidators,
        address[] memory _dataScienceValidators
    ) external onlyRole(ACCREDITATION_AUTHORITY_ROLE) {
        require(bytes(_institutionId).length > 0, "Invalid institution ID");
        require(_expiryDate > block.timestamp, "Invalid expiry date");

        accreditationRecords[_institutionId] = AccreditationRecord({
            institutionId: _institutionId,
            isAccredited: true,
            accreditationDate: block.timestamp,
            expiryDate: _expiryDate,
            certificateHash: _certificateHash,
            validationStatus: ValidationStatus.BOTH_APPROVED,
            propheticValidators: _propheticValidators,
            dataScienceValidators: _dataScienceValidators
        });

        emit AccreditationGranted(_institutionId, _expiryDate, _certificateHash);
    }

    /**
     * @dev Revoke a credential
     */
    function revokeCredential(
        string memory _credentialId,
        string memory _reason
    ) external {
        require(
            hasRole(ACCREDITATION_AUTHORITY_ROLE, msg.sender) ||
            hasRole(INSTITUTION_ROLE, msg.sender),
            "Unauthorized to revoke"
        );
        require(credentials[_credentialId].issueDate > 0, "Credential does not exist");

        credentials[_credentialId].status = CredentialStatus.REVOKED;
        
        emit CredentialRevoked(_credentialId, msg.sender, _reason);
    }

    /**
     * @dev Verify a credential's authenticity and status
     */
    function verifyCredential(string memory _credentialId) 
        external 
        view 
        returns (
            bool isValid,
            CredentialType credentialType,
            CredentialStatus status,
            ValidationStatus validationStatus,
            uint256 issueDate,
            uint256 expiryDate,
            string memory institutionId
        ) 
    {
        Credential memory cred = credentials[_credentialId];
        
        bool valid = cred.issueDate > 0 && 
                    cred.status == CredentialStatus.ACTIVE &&
                    (cred.expiryDate == 0 || cred.expiryDate > block.timestamp) &&
                    accreditationRecords[cred.institutionId].isAccredited &&
                    cred.validationStatus == ValidationStatus.BOTH_APPROVED;

        return (
            valid,
            cred.credentialType,
            cred.status,
            cred.validationStatus,
            cred.issueDate,
            cred.expiryDate,
            cred.institutionId
        );
    }

    /**
     * @dev Get student's credentials
     */
    function getStudentCredentials(address _studentAddress) 
        external 
        view 
        returns (string[] memory) 
    {
        return studentCredentials[_studentAddress];
    }

    /**
     * @dev Check if institution is accredited
     */
    function isInstitutionAccredited(string memory _institutionId) 
        external 
        view 
        returns (bool) 
    {
        AccreditationRecord memory record = accreditationRecords[_institutionId];
        return record.isAccredited && 
               (record.expiryDate == 0 || record.expiryDate > block.timestamp);
    }

    /**
     * @dev Get credential details
     */
    function getCredential(string memory _credentialId) 
        external 
        view 
        returns (Credential memory) 
    {
        return credentials[_credentialId];
    }

    /**
     * @dev Batch verify multiple credentials
     */
    function batchVerifyCredentials(string[] memory _credentialIds) 
        external 
        view 
        returns (bool[] memory) 
    {
        bool[] memory results = new bool[](_credentialIds.length);
        
        for (uint i = 0; i < _credentialIds.length; i++) {
            (bool isValid,,,,,, ) = this.verifyCredential(_credentialIds[i]);
            results[i] = isValid;
        }
        
        return results;
    }
}
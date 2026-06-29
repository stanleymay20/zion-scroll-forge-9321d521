import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';
import { TechnicalCheck, CheckStatus } from './EligibilityChecker';

export interface SystemRequirement {
  category: string;
  requirement: string;
  minimum: string;
  recommended: string;
  critical: boolean;
}

export interface DeviceCompatibility {
  deviceType: string;
  operatingSystem: string;
  version: string;
  compatible: boolean;
  limitations: string[];
}

export interface TechnicalAssessmentResult {
  applicationId: string;
  deviceCompatibility: DeviceCompatibility[];
  internetRequirements: InternetRequirement;
  softwareRequirements: SoftwareRequirement[];
  accessibilitySupport: AccessibilityTechSupport;
  overallCompatibility: CheckStatus;
  recommendations: string[];
  estimatedSetupCost: number;
}

export interface InternetRequirement {
  minimumSpeed: string;
  recommendedSpeed: string;
  currentSpeed?: string;
  stability: string;
  dataUsage: string;
  status: CheckStatus;
}

export interface SoftwareRequirement {
  name: string;
  version: string;
  purpose: string;
  cost: number;
  alternatives: string[];
  status: CheckStatus;
}

export interface AccessibilityTechSupport {
  screenReader: boolean;
  voiceRecognition: boolean;
  keyboardNavigation: boolean;
  highContrast: boolean;
  textToSpeech: boolean;
  closedCaptions: boolean;
  status: CheckStatus;
}

export class TechnicalRequirementsChecker {
  private prisma: PrismaClient;
  private logger: Logger;
  private systemRequirements: SystemRequirement[];

  constructor() {
    this.prisma = new PrismaClient();
    this.logger = new Logger('TechnicalRequirementsChecker');
    this.initializeSystemRequirements();
  }

  /**
   * Initialize system requirements for ScrollUniversity
   */
  private initializeSystemRequirements(): void {
    this.systemRequirements = [
      {
        category: 'Device',
        requirement: 'Computer or Tablet',
        minimum: 'Smartphone with 3GB RAM',
        recommended: 'Laptop/Desktop with 8GB RAM',
        critical: true
      },
      {
        category: 'Operating System',
        requirement: 'Modern OS',
        minimum: 'iOS 12+, Android 8+, Windows 10, macOS 10.14',
        recommended: 'Latest OS versions',
        critical: true
      },
      {
        category: 'Internet Connection',
        requirement: 'Broadband Internet',
        minimum: '5 Mbps download, 1 Mbps upload',
        recommended: '25 Mbps download, 5 Mbps upload',
        critical: true
      },
      {
        category: 'Browser',
        requirement: 'Modern Web Browser',
        minimum: 'Chrome 90+, Firefox 88+, Safari 14+, Edge 90+',
        recommended: 'Latest browser versions',
        critical: true
      },
      {
        category: 'Audio/Video',
        requirement: 'Multimedia Support',
        minimum: 'Built-in speakers/headphones, camera optional',
        recommended: 'Quality headset with microphone, HD webcam',
        critical: false
      },
      {
        category: 'Storage',
        requirement: 'Available Storage',
        minimum: '2GB free space',
        recommended: '10GB free space',
        critical: false
      }
    ];
  }

  /**
   * Assesses technical requirements for an application
   */
  async assessTechnicalRequirements(applicationId: string): Promise<TechnicalAssessmentResult> {
    try {
      this.logger.info(`Assessing technical requirements for application ${applicationId}`);

      // Get application data
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      const technicalData = application.application_data?.technical;
      if (!technicalData) {
        throw new Error('Technical data not found in application');
      }

      // Assess device compatibility
      const deviceCompatibility = await this.assessDeviceCompatibility(technicalData);

      // Check internet requirements
      const internetRequirements = await this.checkInternetRequirements(technicalData);

      // Evaluate software requirements
      const softwareRequirements = await this.evaluateSoftwareRequirements(technicalData);

      // Check accessibility support
      const accessibilitySupport = await this.checkAccessibilitySupport(technicalData);

      // Determine overall compatibility
      const overallCompatibility = this.determineOverallCompatibility({
        deviceCompatibility,
        internetRequirements,
        softwareRequirements,
        accessibilitySupport
      });

      // Generate recommendations
      const recommendations = this.generateTechnicalRecommendations({
        deviceCompatibility,
        internetRequirements,
        softwareRequirements,
        accessibilitySupport,
        overallCompatibility
      });

      // Calculate estimated setup cost
      const estimatedSetupCost = this.calculateSetupCost({
        deviceCompatibility,
        softwareRequirements
      });

      const result: TechnicalAssessmentResult = {
        applicationId,
        deviceCompatibility,
        internetRequirements,
        softwareRequirements,
        accessibilitySupport,
        overallCompatibility,
        recommendations,
        estimatedSetupCost
      };

      this.logger.info(`Technical requirements assessment completed for application ${applicationId}: ${overallCompatibility}`);
      return result;

    } catch (error) {
      this.logger.error(`Error assessing technical requirements for application ${applicationId}:`, error);
      throw error;
    }
  }

  /**
   * Assesses device compatibility
   */
  private async assessDeviceCompatibility(technicalData: any): Promise<DeviceCompatibility[]> {
    const compatibility: DeviceCompatibility[] = [];
    
    if (technicalData.devices) {
      for (const device of technicalData.devices) {
        const deviceCompat = await this.evaluateDeviceCompatibility(device);
        compatibility.push(deviceCompat);
      }
    } else {
      // If no device info provided, assume basic compatibility issues
      compatibility.push({
        deviceType: 'Unknown',
        operatingSystem: 'Unknown',
        version: 'Unknown',
        compatible: false,
        limitations: ['Device information not provided']
      });
    }

    return compatibility;
  }

  /**
   * Evaluates individual device compatibility
   */
  private async evaluateDeviceCompatibility(device: any): Promise<DeviceCompatibility> {
    const limitations: string[] = [];
    let compatible = true;

    // Check device type
    const supportedDevices = ['desktop', 'laptop', 'tablet', 'smartphone'];
    if (!supportedDevices.includes(device.type?.toLowerCase())) {
      limitations.push('Device type may not be optimal for learning');
      compatible = false;
    }

    // Check operating system
    const osCompatibility = this.checkOSCompatibility(device.operatingSystem, device.version);
    if (!osCompatibility.compatible) {
      limitations.push(...osCompatibility.limitations);
      compatible = false;
    }

    // Check RAM
    if (device.ram && parseInt(device.ram) < 3) {
      limitations.push('Insufficient RAM for optimal performance');
      if (parseInt(device.ram) < 2) {
        compatible = false;
      }
    }

    // Check storage
    if (device.storage && parseInt(device.storage) < 16) {
      limitations.push('Limited storage space available');
    }

    return {
      deviceType: device.type || 'Unknown',
      operatingSystem: device.operatingSystem || 'Unknown',
      version: device.version || 'Unknown',
      compatible,
      limitations
    };
  }

  /**
   * Checks operating system compatibility
   */
  private checkOSCompatibility(os: string, version: string): { compatible: boolean; limitations: string[] } {
    const limitations: string[] = [];
    let compatible = true;

    if (!os || !version) {
      return { compatible: false, limitations: ['Operating system information incomplete'] };
    }

    const osLower = os.toLowerCase();
    
    // Windows compatibility
    if (osLower.includes('windows')) {
      const versionNum = parseInt(version);
      if (versionNum < 10) {
        compatible = false;
        limitations.push('Windows 10 or later required');
      }
    }
    
    // macOS compatibility
    else if (osLower.includes('mac') || osLower.includes('darwin')) {
      const versionParts = version.split('.');
      const majorVersion = parseInt(versionParts[0]);
      const minorVersion = parseInt(versionParts[1]);
      
      if (majorVersion < 10 || (majorVersion === 10 && minorVersion < 14)) {
        compatible = false;
        limitations.push('macOS 10.14 (Mojave) or later required');
      }
    }
    
    // iOS compatibility
    else if (osLower.includes('ios')) {
      const versionNum = parseInt(version);
      if (versionNum < 12) {
        compatible = false;
        limitations.push('iOS 12 or later required');
      }
    }
    
    // Android compatibility
    else if (osLower.includes('android')) {
      const versionNum = parseInt(version);
      if (versionNum < 8) {
        compatible = false;
        limitations.push('Android 8.0 or later required');
      }
    }
    
    // Linux compatibility
    else if (osLower.includes('linux') || osLower.includes('ubuntu')) {
      // Most modern Linux distributions are compatible
      limitations.push('Ensure modern browser support');
    }
    
    else {
      limitations.push('Operating system compatibility uncertain');
    }

    return { compatible, limitations };
  }

  /**
   * Checks internet requirements
   */
  private async checkInternetRequirements(technicalData: any): Promise<InternetRequirement> {
    const internetData = technicalData.internet || {};
    
    const requirement: InternetRequirement = {
      minimumSpeed: '5 Mbps download, 1 Mbps upload',
      recommendedSpeed: '25 Mbps download, 5 Mbps upload',
      currentSpeed: internetData.speed,
      stability: 'Stable connection required for live sessions',
      dataUsage: '2-5 GB per month for typical usage',
      status: CheckStatus.PENDING
    };

    if (internetData.speed) {
      const downloadSpeed = this.parseSpeed(internetData.speed);
      
      if (downloadSpeed >= 25) {
        requirement.status = CheckStatus.PASSED;
      } else if (downloadSpeed >= 5) {
        requirement.status = CheckStatus.PASSED; // Minimum met
      } else {
        requirement.status = CheckStatus.FAILED;
      }
    }

    return requirement;
  }

  /**
   * Parses internet speed from string
   */
  private parseSpeed(speedString: string): number {
    const match = speedString.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Evaluates software requirements
   */
  private async evaluateSoftwareRequirements(technicalData: any): Promise<SoftwareRequirement[]> {
    const requirements: SoftwareRequirement[] = [
      {
        name: 'Web Browser',
        version: 'Latest version',
        purpose: 'Access ScrollUniversity platform',
        cost: 0,
        alternatives: ['Chrome', 'Firefox', 'Safari', 'Edge'],
        status: CheckStatus.PENDING
      },
      {
        name: 'PDF Reader',
        version: 'Any modern version',
        purpose: 'View course materials and assignments',
        cost: 0,
        alternatives: ['Adobe Reader', 'Browser built-in', 'Foxit Reader'],
        status: CheckStatus.PASSED
      },
      {
        name: 'Office Suite',
        version: 'Microsoft Office 2016+ or equivalent',
        purpose: 'Create and edit documents, presentations',
        cost: 99,
        alternatives: ['Google Workspace', 'LibreOffice', 'Apple iWork'],
        status: CheckStatus.PENDING
      },
      {
        name: 'Video Conferencing',
        version: 'Zoom, Teams, or equivalent',
        purpose: 'Participate in live classes and meetings',
        cost: 0,
        alternatives: ['Zoom', 'Microsoft Teams', 'Google Meet'],
        status: CheckStatus.PENDING
      }
    ];

    // Check if user has provided software information
    if (technicalData.software) {
      for (const req of requirements) {
        const userSoftware = technicalData.software.find((s: any) => 
          s.name.toLowerCase().includes(req.name.toLowerCase())
        );
        
        if (userSoftware) {
          req.status = CheckStatus.PASSED;
        }
      }
    }

    return requirements;
  }

  /**
   * Checks accessibility support requirements
   */
  private async checkAccessibilitySupport(technicalData: any): Promise<AccessibilityTechSupport> {
    const accessibilityData = technicalData.accessibility || {};
    
    const support: AccessibilityTechSupport = {
      screenReader: accessibilityData.screenReader || false,
      voiceRecognition: accessibilityData.voiceRecognition || false,
      keyboardNavigation: true, // Platform supports this
      highContrast: true, // Platform supports this
      textToSpeech: accessibilityData.textToSpeech || false,
      closedCaptions: true, // Platform provides this
      status: CheckStatus.PASSED
    };

    // If user has specific accessibility needs, ensure they're supported
    if (accessibilityData.needs && accessibilityData.needs.length > 0) {
      const unsupportedNeeds = accessibilityData.needs.filter((need: string) => {
        return !this.isAccessibilityFeatureSupported(need);
      });
      
      if (unsupportedNeeds.length > 0) {
        support.status = CheckStatus.PENDING;
      }
    }

    return support;
  }

  /**
   * Checks if accessibility feature is supported
   */
  private isAccessibilityFeatureSupported(feature: string): boolean {
    const supportedFeatures = [
      'screen reader',
      'keyboard navigation',
      'high contrast',
      'text to speech',
      'closed captions',
      'voice recognition',
      'magnification',
      'alternative text'
    ];
    
    return supportedFeatures.some(supported => 
      feature.toLowerCase().includes(supported)
    );
  }

  /**
   * Determines overall technical compatibility
   */
  private determineOverallCompatibility(assessmentData: {
    deviceCompatibility: DeviceCompatibility[];
    internetRequirements: InternetRequirement;
    softwareRequirements: SoftwareRequirement[];
    accessibilitySupport: AccessibilityTechSupport;
  }): CheckStatus {
    
    // Check if any devices are compatible
    const hasCompatibleDevice = assessmentData.deviceCompatibility.some(device => device.compatible);
    if (!hasCompatibleDevice) {
      return CheckStatus.FAILED;
    }

    // Check internet requirements
    if (assessmentData.internetRequirements.status === CheckStatus.FAILED) {
      return CheckStatus.FAILED;
    }

    // Check critical software requirements
    const criticalSoftwareFailed = assessmentData.softwareRequirements.some(
      req => req.name === 'Web Browser' && req.status === CheckStatus.FAILED
    );
    
    if (criticalSoftwareFailed) {
      return CheckStatus.FAILED;
    }

    // Check accessibility support if needed
    if (assessmentData.accessibilitySupport.status === CheckStatus.FAILED) {
      return CheckStatus.FAILED;
    }

    // Check for pending items
    const hasPendingItems = 
      assessmentData.internetRequirements.status === CheckStatus.PENDING ||
      assessmentData.softwareRequirements.some(req => req.status === CheckStatus.PENDING) ||
      assessmentData.accessibilitySupport.status === CheckStatus.PENDING;

    if (hasPendingItems) {
      return CheckStatus.PENDING;
    }

    return CheckStatus.PASSED;
  }

  /**
   * Generates technical recommendations
   */
  private generateTechnicalRecommendations(assessmentData: {
    deviceCompatibility: DeviceCompatibility[];
    internetRequirements: InternetRequirement;
    softwareRequirements: SoftwareRequirement[];
    accessibilitySupport: AccessibilityTechSupport;
    overallCompatibility: CheckStatus;
  }): string[] {
    const recommendations: string[] = [];

    // Device recommendations
    const incompatibleDevices = assessmentData.deviceCompatibility.filter(d => !d.compatible);
    if (incompatibleDevices.length > 0) {
      recommendations.push('Consider upgrading to a more recent device for optimal learning experience');
      recommendations.push('Minimum requirements: 3GB RAM, modern operating system');
    }

    // Internet recommendations
    if (assessmentData.internetRequirements.status !== CheckStatus.PASSED) {
      recommendations.push('Ensure stable internet connection of at least 5 Mbps for video content');
      recommendations.push('Consider upgrading internet plan for live session participation');
    }

    // Software recommendations
    const pendingSoftware = assessmentData.softwareRequirements.filter(s => s.status === CheckStatus.PENDING);
    if (pendingSoftware.length > 0) {
      recommendations.push('Install required software before course start date');
      recommendations.push('Free alternatives available for most software requirements');
    }

    // Accessibility recommendations
    if (assessmentData.accessibilitySupport.status === CheckStatus.PENDING) {
      recommendations.push('Contact accessibility services for additional support setup');
      recommendations.push('Test accessibility features before course begins');
    }

    // General recommendations
    if (assessmentData.overallCompatibility === CheckStatus.PASSED) {
      recommendations.push('Technical requirements met - ready for ScrollUniversity learning');
      recommendations.push('Consider backup internet connection for important sessions');
    }

    if (assessmentData.overallCompatibility === CheckStatus.PENDING) {
      recommendations.push('Complete technical setup checklist before enrollment');
      recommendations.push('Technical support available during setup process');
    }

    return recommendations;
  }

  /**
   * Calculates estimated setup cost
   */
  private calculateSetupCost(data: {
    deviceCompatibility: DeviceCompatibility[];
    softwareRequirements: SoftwareRequirement[];
  }): number {
    let cost = 0;

    // Device upgrade cost
    const needsDeviceUpgrade = data.deviceCompatibility.every(d => !d.compatible);
    if (needsDeviceUpgrade) {
      cost += 500; // Estimated cost for basic compatible device
    }

    // Software costs
    const paidSoftware = data.softwareRequirements.filter(s => s.cost > 0 && s.status === CheckStatus.PENDING);
    cost += paidSoftware.reduce((sum, software) => sum + software.cost, 0);

    return cost;
  }

  /**
   * Gets system requirements for display
   */
  getSystemRequirements(): SystemRequirement[] {
    return [...this.systemRequirements];
  }

  /**
   * Performs quick compatibility check
   */
  async quickCompatibilityCheck(deviceInfo: any): Promise<{ compatible: boolean; issues: string[] }> {
    const issues: string[] = [];
    let compatible = true;

    // Basic checks
    if (!deviceInfo.operatingSystem) {
      issues.push('Operating system information required');
      compatible = false;
    }

    if (!deviceInfo.browser) {
      issues.push('Modern web browser required');
      compatible = false;
    }

    if (deviceInfo.ram && parseInt(deviceInfo.ram) < 2) {
      issues.push('Insufficient RAM (minimum 2GB required)');
      compatible = false;
    }

    return { compatible, issues };
  }
}
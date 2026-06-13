export interface LegalDocumentSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  effectiveDate: string;
  version: string;
  introduction: string[];
  sections: LegalDocumentSection[];
}

const EFFECTIVE_DATE = 'June 13, 2026';

export const LARGA_TERMS: LegalDocument = {
  title: 'Terms and Conditions',
  effectiveDate: EFFECTIVE_DATE,
  version: 'Version 1.0 - Testing Release',
  introduction: [
    'These Terms and Conditions govern access to and use of the LARGA mobile application during its testing and academic evaluation stage.',
    'By checking the agreement box and creating an account, you confirm that you have read, understood, and agreed to these Terms and Conditions. If you do not agree, do not create or use a LARGA account.',
  ],
  sections: [
    {
      title: '1. Purpose and Current Status',
      paragraphs: [
        'LARGA is a test-stage mobile transportation system for commuters and public utility vehicle drivers in Santa Maria, Bulacan. Its current functions include account authentication, driver applications, active-trip location sharing, route-relevant vehicle visibility, estimated arrival information, and fare estimates based on supported route data.',
        'LARGA is not a ticketing, payment, dispatch, emergency-response, law-enforcement, or official transport-authority service. Features may be changed, limited, suspended, or removed while the system is being tested and improved.',
      ],
    },
    {
      title: '2. Account Registration and Roles',
      paragraphs: [
        'You must provide accurate information, maintain the confidentiality of your password, and promptly report suspected unauthorized access. You are responsible for activity performed through your account unless prohibited by applicable law.',
        'Commuter access may be granted through public registration. Driver access requires a separate application and approval process. An account requesting both roles may receive commuter access while the driver request remains pending. Public registration does not grant administrator access.',
      ],
    },
    {
      title: '3. Driver Applications and Transport Compliance',
      paragraphs: [
        'Driver applicants may be required to provide a vehicle type, plate number, license number, and identification image for internal review. Applicants must be authorized to provide these details and must not submit forged, misleading, or third-party documents without permission.',
        'Approval inside LARGA is an internal system-access decision only. It is not proof of a valid driver license, vehicle registration, franchise, permit, operator authorization, route authority, or compliance with LTO, LTFRB, transport-operator, terminal, cooperative, or law-enforcement requirements.',
      ],
    },
    {
      title: '4. Location and Operational Data',
      paragraphs: [
        'LARGA requests foreground location access for live transport functions. During an active trip, a driver device may publish coordinates, heading, speed, accuracy, and timestamps. A commuter may publish a current GPS point or a manually selected pickup point to identify nearby routes and approaching vehicles.',
        'Location visibility is restricted by the current route and role rules. Commuters are intended to see route-relevant active vehicles, while drivers are intended to see only current waiting points relevant to their active route. Disabling location permission may make live tracking, route matching, ETA, or related functions unavailable.',
      ],
    },
    {
      title: '5. Third-Party Services',
      paragraphs: [
        'The current test release relies on Firebase for authentication and operational database services, Mapbox for map display and limited road-guidance requests, and Cloudinary for driver identification-image uploads when that workflow is used.',
        'These providers may process the information necessary to deliver their services under their own terms, privacy notices, security practices, and availability limits. The current LARGA release does not use Gemini or another generative artificial-intelligence service to process account, identification, or live-location data.',
      ],
    },
    {
      title: '6. Acceptable Use',
      paragraphs: ['You must use LARGA only for lawful transport-related and authorized testing purposes. You must not:'],
      bullets: [
        'access or attempt to access another person\'s account;',
        'submit false identity, license, vehicle, route, or supporting information;',
        'share, steal, probe, bypass, or misuse account credentials or security controls;',
        'alter, destroy, scrape, copy, or collect system data without authorization;',
        'upload malware, harmful code, unlawful material, or documents you are not authorized to provide;',
        'use LARGA for fraud, harassment, stalking, identity theft, unsafe transport activity, or any unlawful purpose.',
      ],
    },
    {
      title: '7. Road Safety',
      paragraphs: [
        'Drivers must obey traffic laws and must not hold, configure, or interact with the application while operating a moving vehicle. Route displays, warnings, and location indicators do not replace safe driving judgment, road signs, lawful instructions, or official transport guidance.',
      ],
    },
    {
      title: '8. Accuracy and Service Limitations',
      paragraphs: [
        'GPS accuracy, device settings, network conditions, provider availability, stored route coverage, and delayed updates may affect the information shown by LARGA. Vehicle positions, ETA values, route matches, terminal information, and fare results are estimates or informational outputs and are not guaranteed to be complete, continuous, or error-free.',
        'Users should confirm fares, routes, vehicle availability, and transport requirements with the relevant driver, operator, terminal, or authority. To the extent permitted by law, the LARGA Research Team is not responsible for loss or harm caused by relying solely on delayed, unavailable, or inaccurate test-stage information.',
      ],
    },
    {
      title: '9. Privacy',
      paragraphs: [
        'The LARGA Privacy Notice forms part of these Terms and explains the categories of information used by the current system, why they are used, which service providers are involved, and how users may raise privacy requests. LARGA is not designed to sell personal information or display behavior-based advertising.',
      ],
    },
    {
      title: '10. Suspension, Testing Access, and Account Requests',
      paragraphs: [
        'The LARGA Research Team may restrict or suspend access when reasonably necessary to protect users, investigate misuse, enforce these Terms, comply with law, or maintain the testing environment. Driver applications may be approved, rejected, or returned for resubmission.',
        'The current test release does not provide a completed in-app account-deletion control. Account, correction, access, or deletion requests must be submitted through the official project contact channel provided by the LARGA Research Team, and identity verification may be required.',
      ],
    },
    {
      title: '11. Intellectual Property',
      paragraphs: [
        'The LARGA name, original application design, source code, documentation, route datasets, and original content may be protected by applicable intellectual-property laws. Users may not reproduce, sell, distribute, or claim ownership of protected LARGA materials without authorization. Third-party software, maps, services, and content remain subject to their respective licenses and policies.',
      ],
    },
    {
      title: '12. Changes to These Terms',
      paragraphs: [
        'These Terms may be revised when the system, testing scope, service providers, security requirements, or applicable law changes. Material revisions should be presented to users before continued use requires a new acceptance.',
      ],
    },
    {
      title: '13. Governing Law',
      paragraphs: [
        'These Terms are governed by the laws of the Republic of the Philippines, including the Data Privacy Act of 2012, the Electronic Commerce Act of 2000, the Cybercrime Prevention Act of 2012, the Intellectual Property Code, applicable National Privacy Commission issuances, and applicable LTO and LTFRB rules.',
      ],
    },
    {
      title: '14. Project Contact',
      paragraphs: [
        'Questions, privacy concerns, account requests, and security reports should be directed to the LARGA Research Team through the official contact channel supplied with the test build or by the project coordinator. A verified public support address must be added before a public production release.',
      ],
    },
  ],
};

export const LARGA_PRIVACY_NOTICE: LegalDocument = {
  title: 'Privacy Notice',
  effectiveDate: EFFECTIVE_DATE,
  version: 'Version 1.0 - Testing Release',
  introduction: [
    'This Privacy Notice describes how the current LARGA testing release handles personal and operational information. It should be read together with the LARGA Terms and Conditions.',
  ],
  sections: [
    {
      title: '1. Information Used by LARGA',
      bullets: [
        'Account information, including user ID, email address, display name, and approved or pending roles.',
        'Driver-application information, including vehicle type, plate number, license number, identification image reference, application status, and review notes.',
        'Driver trip and location information, including route, terminal selections, coordinates, heading, speed, accuracy, timestamps, and trip events.',
        'Commuter waiting-point information, including GPS or manual coordinates, nearby route identifiers, status, and timestamps.',
        'Fare origin and destination selections used during the current app session. These selections are not presently stored as part of the user profile.',
      ],
    },
    {
      title: '2. Why Information Is Used',
      bullets: [
        'Authenticate accounts and restore signed-in sessions.',
        'Assign commuter access and manage pending driver applications.',
        'Operate active trips and publish current driver location.',
        'Match commuters with nearby supported routes and route-relevant vehicles.',
        'Show route-scoped waiting points to relevant active drivers.',
        'Calculate and display route-based ETA and fare estimates.',
        'Protect the service, troubleshoot confirmed issues, and conduct authorized system testing.',
      ],
    },
    {
      title: '3. Location Visibility',
      paragraphs: [
        'LARGA uses foreground location permission. Driver location is published while an active trip is running. Commuter location or a manual pickup point is published while the commuter uses the waiting and route-matching flow.',
        'The system applies role and route restrictions so location data is not intended to be visible to unrelated users. Operational records may remain briefly available until they are cleared or become stale, and stale vehicle or commuter information is excluded from current matching logic.',
      ],
    },
    {
      title: '4. Service Providers',
      bullets: [
        'Firebase: account authentication, session support, and Firestore operational records.',
        'Cloudinary: driver identification-image storage when a driver application includes an upload.',
        'Mapbox: map rendering and limited coordinate or guidance requests needed for map functions.',
      ],
      paragraphs: [
        'The current release does not send account, driver-document, or live-location data to a generative AI service. Service providers may independently process technical information required to operate their platforms under their own privacy notices.',
      ],
    },
    {
      title: '5. Sharing and Access',
      paragraphs: [
        'Information is shared only as needed for the functions described above, authorized project administration, service-provider operation, security investigation, or legal compliance. Driver applications are available to the applicant and authorized administrators. Live transport information is restricted according to the current role and route rules.',
        'LARGA is not designed to sell personal information or disclose exact commuter locations to unrelated commuters.',
      ],
    },
    {
      title: '6. Retention',
      paragraphs: [
        'Active vehicle-location records are deleted when the corresponding driver trip is ended through the normal app flow. Commuter waiting records can be cleared when the waiting flow ends. User profiles, driver applications, review records, and trip events may remain available for account operation, review, security, and authorized testing.',
        'Because LARGA remains in testing, a final production retention schedule has not yet been published. The project team should review and remove or anonymize information that is no longer necessary for the stated purpose, subject to applicable legal, security, and academic requirements.',
      ],
    },
    {
      title: '7. Security',
      paragraphs: [
        'Current safeguards include Firebase Authentication, role-based Firestore rules, ownership checks, route-scoped live-data access, restricted administrator actions, and encrypted network connections provided by the selected platforms. No system can guarantee absolute security, and users must protect their credentials and report suspected misuse.',
      ],
    },
    {
      title: '8. User Choices and Rights',
      paragraphs: [
        'Users may deny or disable location permission, but location-dependent functions may stop working. Subject to applicable law, users may request access, correction, deletion, blocking, or clarification regarding their personal information, withdraw optional consent, object to certain processing, or raise a privacy complaint.',
        'The current test release does not provide complete in-app privacy-request or account-deletion controls. Requests must be sent through the official project contact channel supplied by the LARGA Research Team. The team may verify identity before acting on a request. Users may also raise concerns with the National Privacy Commission of the Philippines.',
      ],
    },
    {
      title: '9. Changes and Contact',
      paragraphs: [
        'This notice may be updated when LARGA adds or removes data practices, service providers, or operational functions. Questions and requests should be directed to the LARGA Research Team through the official contact channel supplied with the test build or by the project coordinator. A verified public privacy contact must be added before public production release.',
      ],
    },
  ],
};

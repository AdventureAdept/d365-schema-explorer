import { EntityMetadata, AttributeMetadata } from '../types';

// Mock Dataverse client for testing without a real org
export class MockDataverseClient {
  private mockEntities: EntityMetadata[] = [
    {
      LogicalName: 'account',
      SchemaName: 'Account',
      DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
      Description: { UserLocalizedLabel: { Label: 'Business that represents a customer or potential customer.' } },
      PrimaryIdAttribute: 'accountid',
      PrimaryNameAttribute: 'name',
      OwnershipType: 'UserOwned',
      IsCustomEntity: false,
      IsManaged: true,
      EntitySetName: 'accounts',
      Attributes: [
        {
          LogicalName: 'accountid',
          SchemaName: 'AccountId',
          DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
          AttributeType: 'Uniqueidentifier',
          IsPrimaryId: true,
          IsPrimaryName: false,
        },
        {
          LogicalName: 'name',
          SchemaName: 'Name',
          DisplayName: { UserLocalizedLabel: { Label: 'Account Name' } },
          AttributeType: 'String',
          IsPrimaryId: false,
          IsPrimaryName: true,
          MaxLength: 160,
        },
        {
          LogicalName: 'accountnumber',
          SchemaName: 'AccountNumber',
          DisplayName: { UserLocalizedLabel: { Label: 'Account Number' } },
          AttributeType: 'String',
          MaxLength: 20,
        },
        {
          LogicalName: 'industrycode',
          SchemaName: 'IndustryCode',
          DisplayName: { UserLocalizedLabel: { Label: 'Industry' } },
          AttributeType: 'Picklist',
          OptionSet: {
            Name: 'industrycode',
            Options: [
              { Value: 1, Label: { UserLocalizedLabel: { Label: 'Accounting' } } },
              { Value: 2, Label: { UserLocalizedLabel: { Label: 'Agriculture' } } },
              { Value: 3, Label: { UserLocalizedLabel: { Label: 'Apparel' } } },
            ],
          },
        },
        {
          LogicalName: 'revenue',
          SchemaName: 'Revenue',
          DisplayName: { UserLocalizedLabel: { Label: 'Annual Revenue' } },
          AttributeType: 'Money',
        },
        {
          LogicalName: 'parentaccountid',
          SchemaName: 'ParentAccountId',
          DisplayName: { UserLocalizedLabel: { Label: 'Parent Account' } },
          AttributeType: 'Lookup',
          Targets: ['account'],
        },
      ],
      ManyToOneRelationships: [
        {
          SchemaName: 'account_parent_account',
          ReferencingEntity: 'account',
          ReferencingAttribute: 'parentaccountid',
          ReferencedEntity: 'account',
          ReferencedAttribute: 'accountid',
        },
      ],
      OneToManyRelationships: [
        {
          SchemaName: 'account_parent_account',
          ReferencingEntity: 'account',
          ReferencingAttribute: 'parentaccountid',
          ReferencedEntity: 'account',
          ReferencedAttribute: 'accountid',
        },
        {
          SchemaName: 'contact_customer_accounts',
          ReferencingEntity: 'contact',
          ReferencingAttribute: 'parentcustomerid',
          ReferencedEntity: 'account',
          ReferencedAttribute: 'accountid',
        },
      ],
    },
    {
      LogicalName: 'contact',
      SchemaName: 'Contact',
      DisplayName: { UserLocalizedLabel: { Label: 'Contact' } },
      Description: { UserLocalizedLabel: { Label: 'Person with whom a business unit has a relationship.' } },
      PrimaryIdAttribute: 'contactid',
      PrimaryNameAttribute: 'fullname',
      OwnershipType: 'UserOwned',
      IsCustomEntity: false,
      IsManaged: true,
      EntitySetName: 'contacts',
      Attributes: [
        {
          LogicalName: 'contactid',
          SchemaName: 'ContactId',
          DisplayName: { UserLocalizedLabel: { Label: 'Contact' } },
          AttributeType: 'Uniqueidentifier',
          IsPrimaryId: true,
        },
        {
          LogicalName: 'fullname',
          SchemaName: 'FullName',
          DisplayName: { UserLocalizedLabel: { Label: 'Full Name' } },
          AttributeType: 'String',
          IsPrimaryName: true,
          MaxLength: 160,
        },
        {
          LogicalName: 'firstname',
          SchemaName: 'FirstName',
          DisplayName: { UserLocalizedLabel: { Label: 'First Name' } },
          AttributeType: 'String',
          MaxLength: 50,
        },
        {
          LogicalName: 'lastname',
          SchemaName: 'LastName',
          DisplayName: { UserLocalizedLabel: { Label: 'Last Name' } },
          AttributeType: 'String',
          MaxLength: 50,
        },
        {
          LogicalName: 'emailaddress1',
          SchemaName: 'EMailAddress1',
          DisplayName: { UserLocalizedLabel: { Label: 'Email' } },
          AttributeType: 'String',
          MaxLength: 100,
        },
        {
          LogicalName: 'parentcustomerid',
          SchemaName: 'ParentCustomerId',
          DisplayName: { UserLocalizedLabel: { Label: 'Company Name' } },
          AttributeType: 'Customer',
          Targets: ['account', 'contact'],
        },
      ],
    },
    {
      LogicalName: 'opportunity',
      SchemaName: 'Opportunity',
      DisplayName: { UserLocalizedLabel: { Label: 'Opportunity' } },
      Description: { UserLocalizedLabel: { Label: 'Potential revenue-generating event.' } },
      PrimaryIdAttribute: 'opportunityid',
      PrimaryNameAttribute: 'name',
      OwnershipType: 'UserOwned',
      IsCustomEntity: false,
      IsManaged: true,
      EntitySetName: 'opportunities',
      Attributes: [
        {
          LogicalName: 'opportunityid',
          SchemaName: 'OpportunityId',
          DisplayName: { UserLocalizedLabel: { Label: 'Opportunity' } },
          AttributeType: 'Uniqueidentifier',
          IsPrimaryId: true,
        },
        {
          LogicalName: 'name',
          SchemaName: 'Name',
          DisplayName: { UserLocalizedLabel: { Label: 'Topic' } },
          AttributeType: 'String',
          IsPrimaryName: true,
          MaxLength: 300,
        },
        {
          LogicalName: 'estimatedvalue',
          SchemaName: 'EstimatedValue',
          DisplayName: { UserLocalizedLabel: { Label: 'Estimated Revenue' } },
          AttributeType: 'Money',
        },
        {
          LogicalName: 'estimatedclosedate',
          SchemaName: 'EstimatedCloseDate',
          DisplayName: { UserLocalizedLabel: { Label: 'Est. Close Date' } },
          AttributeType: 'DateTime',
        },
        {
          LogicalName: 'customerid',
          SchemaName: 'CustomerId',
          DisplayName: { UserLocalizedLabel: { Label: 'Potential Customer' } },
          AttributeType: 'Customer',
          Targets: ['account', 'contact'],
        },
      ],
    },
    {
      LogicalName: 'custom_project',
      SchemaName: 'custom_Project',
      DisplayName: { UserLocalizedLabel: { Label: 'Project' } },
      Description: { UserLocalizedLabel: { Label: 'Custom project entity for tracking.' } },
      PrimaryIdAttribute: 'custom_projectid',
      PrimaryNameAttribute: 'custom_name',
      OwnershipType: 'UserOwned',
      IsCustomEntity: true,
      IsManaged: false,
      EntitySetName: 'custom_projects',
      Attributes: [
        {
          LogicalName: 'custom_projectid',
          SchemaName: 'custom_ProjectId',
          DisplayName: { UserLocalizedLabel: { Label: 'Project' } },
          AttributeType: 'Uniqueidentifier',
          IsPrimaryId: true,
        },
        {
          LogicalName: 'custom_name',
          SchemaName: 'custom_Name',
          DisplayName: { UserLocalizedLabel: { Label: 'Project Name' } },
          AttributeType: 'String',
          IsPrimaryName: true,
          MaxLength: 100,
        },
        {
          LogicalName: 'custom_budget',
          SchemaName: 'custom_Budget',
          DisplayName: { UserLocalizedLabel: { Label: 'Budget' } },
          AttributeType: 'Money',
        },
        {
          LogicalName: 'custom_startdate',
          SchemaName: 'custom_StartDate',
          DisplayName: { UserLocalizedLabel: { Label: 'Start Date' } },
          AttributeType: 'DateTime',
        },
      ],
    },
  ];

  async testConnection(): Promise<boolean> {
    return true;
  }

  async getWhoAmI(): Promise<{ UserId: string; OrganizationId: string }> {
    return {
      UserId: 'mock-user-id',
      OrganizationId: 'mock-org-id',
    };
  }

  async getEntityDefinitions(): Promise<EntityMetadata[]> {
    return this.mockEntities.map(e => ({
      LogicalName: e.LogicalName,
      SchemaName: e.SchemaName,
      DisplayName: e.DisplayName,
      Description: e.Description,
      PrimaryIdAttribute: e.PrimaryIdAttribute,
      PrimaryNameAttribute: e.PrimaryNameAttribute,
      OwnershipType: e.OwnershipType,
      IsCustomEntity: e.IsCustomEntity,
      IsManaged: e.IsManaged,
      EntitySetName: e.EntitySetName,
    }));
  }

  async getEntityDefinition(logicalName: string): Promise<EntityMetadata> {
    const entity = this.mockEntities.find(e => e.LogicalName === logicalName);
    if (!entity) {
      throw new Error(`Entity ${logicalName} not found`);
    }
    return entity;
  }

  async getEntityAttributes(logicalName: string): Promise<AttributeMetadata[]> {
    const entity = this.mockEntities.find(e => e.LogicalName === logicalName);
    return entity?.Attributes || [];
  }

  async getFullEntityMetadata(logicalName: string): Promise<EntityMetadata> {
    return this.getEntityDefinition(logicalName);
  }

  async searchEntities(query: string): Promise<EntityMetadata[]> {
    const lowerQuery = query.toLowerCase();
    return this.mockEntities.filter(e =>
      e.LogicalName.toLowerCase().includes(lowerQuery) ||
      e.SchemaName.toLowerCase().includes(lowerQuery) ||
      e.DisplayName?.UserLocalizedLabel?.Label?.toLowerCase().includes(lowerQuery)
    );
  }

  getOrgUrl(): string {
    return 'https://mock-org.crm.dynamics.com';
  }
}

export default MockDataverseClient;

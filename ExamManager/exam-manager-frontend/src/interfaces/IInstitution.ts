export interface IInstitution {
  id: number;
  name: string;
  educationalId: string;
  zipCode: number;
  town: string;
  street: string;
  number: string;
  floor?: string;
  door?: string;
}

export interface InstitutionFormData {
  name: string;
  educationalId: string;
  zipCode: number;
  town: string;
  street: string;
  number: string;
  floor?: string;
  door?: string;
}
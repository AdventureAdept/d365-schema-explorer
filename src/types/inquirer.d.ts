declare module 'inquirer' {
  export interface Question {
    type?: string;
    name: string;
    message?: string;
    default?: any;
    choices?: any[];
    validate?: (input: any) => boolean | string;
    filter?: (input: any) => any;
    when?: (answers: any) => boolean;
  }

  export interface Answers {
    [key: string]: any;
  }

  export function prompt(questions: Question[]): Promise<Answers>;
  
  export default { prompt };
}

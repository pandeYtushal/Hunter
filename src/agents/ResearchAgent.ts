import { researchCompany } from "../ai/researchAgent";
import type { PageSnapshot } from "../shared/types/messages";

export interface ResearchAgentOutput {
  company: string;
  overview: string;
  products: string[];
  recommendations: string[];
}

export const ResearchAgent = {
  async researchCompany(companyName: string, pageContext?: PageSnapshot): Promise<ResearchAgentOutput> {
    const rawResearch = await researchCompany(companyName, pageContext);
    
    const productsList = rawResearch.keyProducts.includes(",")
      ? rawResearch.keyProducts.split(",").map((p) => p.trim()).filter(Boolean)
      : [rawResearch.keyProducts.trim()];

    return {
      company: companyName,
      overview: rawResearch.companyOverview,
      products: productsList,
      recommendations: [
        `Culture: ${rawResearch.companyCulture}`,
        `Interview Advice: ${rawResearch.interviewTips}`
      ]
    };
  }
};

import {
  CANCELLATION_AGENT_MODEL,
  DraftCancellationEmailSchema,
  CANCELLATION_DRAFT_USER_MESSAGE,
  CANCELLATION_AGENT_SYSTEM_PROMPT,
} from './constants/cancellation-agent.constant';

import {
  IDraftedCancellation,
  ICancellationDraftContext,
} from './interfaces/cancellation-draft.interface';

import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { TInsightType } from '@Modules/insight/constants/insight-type.constant';

@Injectable()
export class CancellationAgentService {
  private readonly llm = new ChatAnthropic({ model: CANCELLATION_AGENT_MODEL });

  public async draftCancellation(
    context: ICancellationDraftContext,
  ): Promise<IDraftedCancellation | null> {
    if (!this.isEligibleForDraft(context)) {
      return null;
    }

    const agent = createReactAgent({
      llm: this.llm,
      tools: this.buildTools(context),
      prompt: CANCELLATION_AGENT_SYSTEM_PROMPT,
      responseFormat: DraftCancellationEmailSchema,
    });

    const result = await agent.invoke({
      messages: [{ role: 'user', content: CANCELLATION_DRAFT_USER_MESSAGE }],
    });

    return result.structuredResponse;
  }

  private isEligibleForDraft(context: ICancellationDraftContext): boolean {
    const hasNoCancellationEmail = context.vendor.cancellationEmail == null;
    const isInformationalOnly =
      context.insight.type === TInsightType.HIGH_SPENDING;

    return !hasNoCancellationEmail && !isInformationalOnly;
  }

  private buildTools(context: ICancellationDraftContext) {
    return [
      tool(
        () =>
          JSON.stringify({
            vendorName: context.vendor.name,
            cancellationEmail: context.vendor.cancellationEmail,
            billingCycle: context.vendor.billingCycle,
          }),
        {
          name: 'get_vendor_cancellation_info',
          description:
            "Get the vendor's name, official cancellation email, and billing cycle.",
          schema: z.object({}),
        },
      ),
      tool(
        () =>
          JSON.stringify({
            insightType: context.insight.type,
            insightBody: context.insight.body,
            estimatedMonthlySavings: context.insight.estimatedMonthlySavings,
            subscriptionAmount: context.subscription?.amount ?? null,
            subscriptionCurrency: context.subscription?.currency ?? null,
          }),
        {
          name: 'get_leak_context',
          description:
            'Get the details of the detected financial leak that triggered this draft.',
          schema: z.object({}),
        },
      ),
    ];
  }
}

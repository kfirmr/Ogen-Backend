import { Injectable } from '@nestjs/common';
import { TypedLogger } from '../../logger/logger.service';
import { VendorService } from '@Modules/vendor/vendor.service';
import { Insight } from '@Modules/insight/entities/insight.entity';
import { InsightScanService } from '@Modules/insight/insight-scan.service';
import { DraftActionService } from '@Modules/draft-action/draft-action.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';
import { TDraftActionType } from '@Modules/draft-action/constants/draft-action-type.constant';
import { CancellationAgentService } from '@Modules/cancellation-agent/cancellation-agent.service';

@Injectable()
export class LeakResponseService {
  private readonly logger = new TypedLogger('LeakResponseService');

  constructor(
    private readonly vendorService: VendorService,
    private readonly insightScanService: InsightScanService,
    private readonly draftActionService: DraftActionService,
    private readonly subscriptionService: SubscriptionService,
    private readonly cancellationAgentService: CancellationAgentService,
  ) {}

  // Runs the SQL leak scan for this user, then tries to draft a "Done For You" intervention for
  // each newly-detected leak. One agent failure never blocks the others or fails the import.
  public async scanAndRespond(userId: string, importId: string): Promise<void> {
    const insights = await this.insightScanService.scanForUser(
      userId,
      importId,
    );

    const results = await Promise.allSettled(
      insights.map((insight) => this.respondToInsight(userId, insight)),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error({
          message: 'Failed to draft an action for a detected leak',
          error: result.reason,
        });
      }
    }
  }

  // Only subscription-scoped leaks (OVERPAYING/DUPLICATE) resolve to a vendor worth drafting a
  // cancellation for; transaction-scoped HIGH_SPENDING insights are informational, not actionable.
  private async respondToInsight(
    userId: string,
    insight: Insight,
  ): Promise<void> {
    if (insight.subscriptionId == null) {
      return;
    }

    const subscription = await this.subscriptionService.getById(
      insight.subscriptionId,
      userId,
    );

    if (subscription.vendorId == null) {
      return;
    }

    const vendor = await this.vendorService.getById(subscription.vendorId);
    const draft = await this.cancellationAgentService.draftCancellation({
      vendor,
      insight,
      subscription,
    });

    if (draft == null) {
      return;
    }

    await this.draftActionService.create({
      userId,
      subject: draft.subject,
      body: draft.body,
      insightId: insight.id,
      vendorId: vendor.id,
      reasoning: draft.reasoning,
      subscriptionId: subscription.id,
      targetEmail: vendor.cancellationEmail,
      actionType: TDraftActionType.CANCELLATION_EMAIL,
    });
  }
}

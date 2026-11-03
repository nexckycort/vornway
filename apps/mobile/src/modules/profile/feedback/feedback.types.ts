import type { ApiSuccess } from '@vornway/api-client';
import { Option, Schema } from 'effect';

export type FeedbackItem = ApiSuccess<'feedback', 'list'>['data'][number];
export type FeedbackType = 'BUG' | 'FEATURE_REQUEST';
export type FeedbackStatus = FeedbackItem['status'];

const FeedbackAttachments = Schema.Array(Schema.Struct({ url: Schema.String }));

export const feedbackAttachments = (metadata: FeedbackItem['metadata']) =>
  Option.getOrElse(
    Schema.decodeUnknownOption(FeedbackAttachments)(metadata.attachments),
    () => [],
  );

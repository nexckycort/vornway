import { describe, expect, test } from 'bun:test';
import {
  feedbackAttachmentKey,
  resolveFeedbackAttachmentUrl,
} from './attachment-url';

describe('resolveFeedbackAttachmentUrl', () => {
  test('resolves stored paths against the asset host and keeps absolute URLs', () => {
    expect(resolveFeedbackAttachmentUrl(null)).toBeNull();
    expect(
      resolveFeedbackAttachmentUrl('/feedback/ana/1/attachment-1.webp'),
    ).toBe('https://assets.vornway.com/feedback/ana/1/attachment-1.webp');
    expect(
      resolveFeedbackAttachmentUrl('feedback/ana/1/attachment-1.webp'),
    ).toBe('https://assets.vornway.com/feedback/ana/1/attachment-1.webp');
    expect(resolveFeedbackAttachmentUrl('https://cdn.example.com/a.webp')).toBe(
      'https://cdn.example.com/a.webp',
    );
  });
});

describe('feedbackAttachmentKey', () => {
  test('finds the bucket key of feedback attachments only', () => {
    const key = 'feedback/ana/1/attachment-1.webp';

    expect(feedbackAttachmentKey(`/${key}`)).toBe(key);
    expect(feedbackAttachmentKey(`https://assets.vornway.com/${key}`)).toBe(
      key,
    );
    expect(feedbackAttachmentKey('/users/ana/avatar.webp')).toBeNull();
    expect(
      feedbackAttachmentKey('https://cdn.example.com/feedback/a.webp'),
    ).toBeNull();
    expect(feedbackAttachmentKey(undefined)).toBeNull();
  });
});

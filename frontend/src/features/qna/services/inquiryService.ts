import api from '../../../common/utils/api';

// Q&A 화면 1:1 문의 접수. 공개 팁/FAQ 콘텐츠(qnaService)와는 별개 API — 혼용 금지.

export interface InquirySubmitPayload {
  name: string;
  email: string;
  content: string;
}

async function submit(payload: InquirySubmitPayload): Promise<void> {
  await api.post('/api/inquiries', payload);
}

const inquiryService = {
  submit,
};

export default inquiryService;

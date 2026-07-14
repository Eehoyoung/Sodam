import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import QnAScreen from '../../src/features/qna/screens/QnAScreen';

jest.mock('../../src/features/qna/services/inquiryService', () => ({
  __esModule: true,
  default: {
    submit: jest.fn(),
  },
}));

import inquiryService from '../../src/features/qna/services/inquiryService';

jest.mock('../../src/common/components/ds', () => {
  const actual = jest.requireActual('../../src/common/components/ds');
  return {
    ...actual,
    AppToast: {
      warn: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

import {AppToast} from '../../src/common/components/ds';

describe('QnAScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('submitting the inquiry form actually calls the backend and shows success', async () => {
    (inquiryService.submit as jest.Mock).mockResolvedValueOnce(undefined);

    const {getByPlaceholderText, getByTestId} = render(<QnAScreen />);

    fireEvent.changeText(getByPlaceholderText('이름을 입력하세요'), '홍길동');
    fireEvent.changeText(getByPlaceholderText('이메일을 입력하세요'), 'hong@example.com');
    fireEvent.changeText(getByPlaceholderText('문의 내용을 입력하세요'), '출퇴근 화면에서 오류가 나요.');
    fireEvent.press(getByTestId('qna-inquiry-submit'));

    await waitFor(() => {
      expect(inquiryService.submit).toHaveBeenCalledWith({
        name: '홍길동',
        email: 'hong@example.com',
        content: '출퇴근 화면에서 오류가 나요.',
      });
      expect(AppToast.success).toHaveBeenCalled();
    });
  });

  test('shows a warning toast and does not call the API when a field is empty', async () => {
    const {getByPlaceholderText, getByTestId} = render(<QnAScreen />);

    fireEvent.changeText(getByPlaceholderText('이름을 입력하세요'), '홍길동');
    fireEvent.press(getByTestId('qna-inquiry-submit'));

    await waitFor(() => {
      expect(AppToast.warn).toHaveBeenCalled();
      expect(inquiryService.submit).not.toHaveBeenCalled();
    });
  });

  test('shows an error toast when the backend call fails', async () => {
    (inquiryService.submit as jest.Mock).mockRejectedValueOnce(new Error('network'));

    const {getByPlaceholderText, getByTestId} = render(<QnAScreen />);

    fireEvent.changeText(getByPlaceholderText('이름을 입력하세요'), '홍길동');
    fireEvent.changeText(getByPlaceholderText('이메일을 입력하세요'), 'hong@example.com');
    fireEvent.changeText(getByPlaceholderText('문의 내용을 입력하세요'), '문의 내용');
    fireEvent.press(getByTestId('qna-inquiry-submit'));

    await waitFor(() => {
      expect(AppToast.error).toHaveBeenCalled();
    });
  });
});

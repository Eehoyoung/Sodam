import api from '../../../common/api/client';

const accountService = {
    // [API Mapping] PUT /api/user/me — 본인 계정 정보(이름 등) 수정
    updateMe: async (payload: {name: string}): Promise<void> => {
        await api.put('/api/user/me', payload);
    },

    // [API Mapping] DELETE /api/user/{userId} — 회원 탈퇴(90일 후 개인정보 익명화)
    withdraw: async (userId: number): Promise<void> => {
        await api.delete(`/api/user/${userId}`);
    },
};

export default accountService;

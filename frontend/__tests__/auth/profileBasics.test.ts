import userService, {ProfileBasicsPayload} from '../../src/features/auth/services/userService';
import api from '../../src/common/api/client';

jest.mock('../../src/common/api/client', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
    },
}));

// [Test Mapping] ProfileBasics 보강 — 회원가입 직후 1회성 수집.
// BE PUT /api/user/me/profile-basics ProfileBasicsUpdateDto = {phone @NotBlank @Pattern, name @Size, birthDate}

describe('userService.updateProfileBasics', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('phone 누락 시 PHONE_REQUIRED throw — API 미호출 (fail-fast)', async () => {
        await expect(
            userService.updateProfileBasics({} as ProfileBasicsPayload),
        ).rejects.toThrow('PHONE_REQUIRED');
        expect(api.put).not.toHaveBeenCalled();
    });

    test('phone 만 전송 (이름·생년월일 optional)', async () => {
        (api.put as jest.Mock).mockResolvedValue({
            data: {data: {userId: 1, phone: '01012345678', profileCompleted: true}},
        });

        await userService.updateProfileBasics({phone: '010-1234-5678'});

        expect(api.put).toHaveBeenCalledWith('/api/user/me/profile-basics', {
            phone: '010-1234-5678',
            name: undefined,
            birthDate: undefined,
        });
    });

    test('하이픈 포함된 phone trim 후 전송 (BE 가 숫자만 저장)', async () => {
        (api.put as jest.Mock).mockResolvedValue({data: {}});

        await userService.updateProfileBasics({
            phone: '  010-9999-8888  ',
            name: ' 홍길동 ',
            birthDate: '1990-01-01',
        });

        expect((api.put as jest.Mock).mock.calls[0][1]).toEqual({
            phone: '010-9999-8888',
            name: '홍길동',
            birthDate: '1990-01-01',
        });
    });

    test('빈 이름은 undefined 로 (BE 에서 기존 이름 유지)', async () => {
        (api.put as jest.Mock).mockResolvedValue({data: {}});

        await userService.updateProfileBasics({phone: '01011112222', name: '   '});

        expect((api.put as jest.Mock).mock.calls[0][1].name).toBeUndefined();
    });

    test('응답 정규화: profileCompleted boolean + alias', async () => {
        (api.put as jest.Mock).mockResolvedValue({
            data: {
                data: {
                    userId: 5,
                    name: '홍길동',
                    phone: '01098765432',
                    profileCompleted: true,
                },
            },
        });

        const result = await userService.updateProfileBasics({phone: '010-9876-5432'});

        expect(result).toEqual({
            id: 5,
            name: '홍길동',
            phone: '01098765432',
            profileCompleted: true,
        });
    });

    test('envelope 없는 평탄한 응답도 해체', async () => {
        (api.put as jest.Mock).mockResolvedValue({
            data: {userId: 7, phone: '01000001111', profileCompleted: true},
        });

        const result = await userService.updateProfileBasics({phone: '010-0000-1111'});

        expect(result.id).toBe(7);
        expect(result.profileCompleted).toBe(true);
    });
});

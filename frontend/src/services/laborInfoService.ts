import api from '../common/utils/api';

/**
 * 노무 정보 DTO
 * Backend API: GET /api/labor-info/current
 */
export interface LaborInfoDto {
  id: number;
  title: string;
  content: string;
  imagePath?: string;
  minimumWage: number;
  year: number;
  weeklyMaxHours: number;
  overtimeRate: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 현재 적용 중인 노무 기준값 조회
 * @returns LaborInfoDto
 */
const getCurrentLaborInfo = async (): Promise<LaborInfoDto> => {
  const res = await api.get<LaborInfoDto>('/api/labor-info/current');
  const data: any = res.data as any;

  // 방어적 파싱
  if (data?.id) {
    return data as LaborInfoDto;
  }
  if (data?.data?.id) {
    return data.data as LaborInfoDto;
  }

  throw new Error('Invalid labor info data received');
};

/**
 * 노무 정보 ID로 조회
 * @param id 노무 정보 ID
 * @returns LaborInfoDto
 */
const getLaborInfoById = async (id: number): Promise<LaborInfoDto> => {
  const res = await api.get<LaborInfoDto>(`/api/labor-info/${id}`);
  const data: any = res.data as any;

  if (data?.id) {
    return data as LaborInfoDto;
  }
  if (data?.data?.id) {
    return data.data as LaborInfoDto;
  }

  throw new Error('Invalid labor info data received');
};

const laborInfoService = {
  getCurrentLaborInfo,
  getLaborInfoById,
};

export default laborInfoService;

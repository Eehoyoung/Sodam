#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API 문서 변환 스크립트
JSON 형식의 OpenAPI 명세를 YAML 형식으로 변환하고 상세 설명을 추가합니다.
"""

import json
import yaml
from collections import OrderedDict


def represent_ordereddict(dumper, data):
    """OrderedDict를 YAML로 변환할 때 순서 유지"""
    return dumper.represent_dict(data.items())


yaml.add_representer(OrderedDict, represent_ordereddict)


def enhance_api_description(path, method, api_spec):
    """API 엔드포인트에 상세 설명 추가"""

    # API 카테고리별 비즈니스 로직 설명
    business_logic = {
        "인증": "사용자 인증 및 권한 관리를 담당합니다.",
        "출퇴근 관리": "NFC 태그 또는 위치 기반으로 출퇴근을 기록하고 근무 시간을 자동 계산합니다.",
        "급여 관리": "근무 시간과 시급을 기반으로 급여를 자동 계산하고 명세서를 생성합니다.",
        "임금 관리": "매장별, 직원별 시급 정보를 관리하고 최저임금 준수 여부를 확인합니다.",
        "사용자 관리": "사업주와 직원의 정보를 관리하고 권한을 설정합니다.",
        "매장 관리": "매장 정보, 위치, 직원 배치를 관리합니다.",
        "급여 정책": "야간 수당, 휴일 수당 등 매장별 급여 정책을 설정합니다.",
    }

    tags = api_spec.get('tags', [])
    tag = tags[0] if tags else "기타"

    # 기존 description 강화
    original_desc = api_spec.get('description', '')

    enhanced_desc = f"""
**API 목적**: {original_desc if original_desc else api_spec.get('summary', '')}

**비즈니스 로직**: {business_logic.get(tag, 'API 기능을 수행합니다.')}

**사용 시나리오**:
"""

    # 엔드포인트별 사용 시나리오 추가
    if '/auth/' in path:
        enhanced_desc += """
1. 사용자가 로그인 정보를 입력합니다.
2. 서버에서 인증 정보를 확인합니다.
3. JWT 토큰을 생성하여 반환합니다.
4. 클라이언트는 토큰을 저장하고 이후 요청에 포함합니다.
"""
    elif '/attendance/' in path:
        enhanced_desc += """
1. 직원이 출근/퇴근 시 NFC 태그를 태깅하거나 앱에서 버튼을 클릭합니다.
2. 서버에서 현재 시간과 위치 정보를 기록합니다.
3. 중복 체크 및 유효성 검증을 수행합니다.
4. 출퇴근 기록이 데이터베이스에 저장됩니다.
"""
    elif '/payroll/' in path or '/wages/' in path:
        enhanced_desc += """
1. 관리자가 급여 계산을 요청합니다.
2. 서버에서 출퇴근 기록을 조회합니다.
3. 근무 시간, 시급, 수당을 계산합니다.
4. 급여 명세서를 생성하여 반환합니다.
"""
    elif '/stores/' in path:
        enhanced_desc += """
1. 사업주가 매장 정보를 입력합니다.
2. 서버에서 필수 정보를 검증합니다.
3. 매장이 등록되거나 수정됩니다.
4. 등록된 매장 정보를 반환합니다.
"""
    else:
        enhanced_desc += """
1. 클라이언트가 필요한 정보를 요청합니다.
2. 서버에서 권한을 확인합니다.
3. 데이터를 조회하거나 처리합니다.
4. 결과를 클라이언트에 반환합니다.
"""

    # 주의사항 추가
    enhanced_desc += """
**주의사항**:
"""
    if method.upper() in ['POST', 'PUT', 'DELETE']:
        enhanced_desc += "- 이 API는 데이터를 변경하므로 신중하게 사용해야 합니다.\n"

    if api_spec.get('security'):
        enhanced_desc += "- JWT 토큰 인증이 필요합니다. Authorization 헤더를 포함해야 합니다.\n"

    if '{' in path:
        enhanced_desc += "- 경로 파라미터는 반드시 유효한 값이어야 합니다.\n"

    enhanced_desc += f"- 성공 시 HTTP 200 응답을 받습니다.\n"
    enhanced_desc += f"- 실패 시 적절한 에러 코드와 메시지를 확인하세요.\n"

    return enhanced_desc


def add_request_examples(api_spec, path, method):
    """요청 예시 추가"""
    examples = {}

    # 인증 API 예시
    if '/auth/login' in path and method == 'post':
        examples['application/json'] = {
            'example': {
                'email': 'user@example.com',
                'password': 'securePassword123!'
            }
        }
    elif '/auth/kakao' in path and method == 'post':
        examples['application/json'] = {
            'example': {
                'kakaoAccessToken': 'kakao_access_token_here'
            }
        }
    # 출퇴근 API 예시
    elif '/attendance/check-in' in path and method == 'post':
        examples['application/json'] = {
            'example': {
                'storeId': 1,
                'nfcTagId': 'NFC123456',
                'latitude': 37.5665,
                'longitude': 126.9780
            }
        }
    # 급여 계산 예시
    elif '/payroll/calculate' in path and method == 'post':
        examples['application/json'] = {
            'example': {
                'employeeId': 10,
                'storeId': 1,
                'year': 2025,
                'month': 10
            }
        }

    return examples


def convert_json_to_enhanced_yaml(json_file_path, yaml_file_path):
    """JSON을 상세 설명이 추가된 YAML로 변환"""

    # JSON 파일 읽기
    with open(json_file_path, 'r', encoding='utf-8') as f:
        api_data = json.load(f, object_pairs_hook=OrderedDict)

    # YAML 파일의 헤더 부분 생성
    yaml_header = """openapi: 3.0.1

# =============================================================================
# 소담(SODAM) API 명세서
# =============================================================================
# 목적: 소상공인을 위한 아르바이트 근태 및 급여 관리 서비스 API
# 대상: 프론트엔드 개발자, 외부 연동 개발자
# 작성일: 2025-10-14
# 버전: v1.0.0
# =============================================================================

"""

    # paths 섹션의 각 API에 상세 설명 추가
    if 'paths' in api_data:
        for path, methods in api_data['paths'].items():
            for method, api_spec in methods.items():
                # 상세 설명 추가
                enhanced_desc = enhance_api_description(path, method, api_spec)
                api_spec['description'] = enhanced_desc

                # 요청 예시 추가
                if 'requestBody' in api_spec:
                    if 'content' not in api_spec['requestBody']:
                        api_spec['requestBody']['content'] = {}
                    examples = add_request_examples(api_spec, path, method)
                    if examples:
                        api_spec['requestBody']['content'].update(examples)

    # YAML 파일로 저장
    with open(yaml_file_path, 'w', encoding='utf-8') as f:
        f.write(yaml_header)
        yaml.dump(api_data, f,
                  allow_unicode=True,
                  default_flow_style=False,
                  sort_keys=False,
                  width=120,
                  indent=2)

    print(f"✅ API 문서 변환 완료!")
    print(f"📄 입력: {json_file_path}")
    print(f"📄 출력: {yaml_file_path}")
    print(f"📊 총 API 수: {len(api_data.get('paths', {}))}")


if __name__ == "__main__":
    json_path = "ApiList.json"
    yaml_path = "ApiList_Full.yaml"

    convert_json_to_enhanced_yaml(json_path, yaml_path)

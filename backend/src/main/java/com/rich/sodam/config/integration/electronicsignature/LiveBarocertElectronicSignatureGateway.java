package com.rich.sodam.config.integration.electronicsignature;

import com.barocert.BarocertException;
import com.barocert.ServiceImpBase;
import com.barocert.kakaocert.KakaocertService;
import com.barocert.kakaocert.KakaocertServiceImp;
import com.barocert.navercert.NavercertService;
import com.barocert.navercert.NavercertServiceImp;
import com.barocert.tosscert.TosscertService;
import com.barocert.tosscert.TosscertServiceImp;
import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureGateway;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureReceipt;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureRequest;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureStatus;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureVerification;
import com.rich.sodam.core.electronicsignature.ProviderSignatureStatus;
import com.rich.sodam.core.electronicsignature.SignerIdentity;
import com.rich.sodam.core.electronicsignature.VerifiedSignerIdentity;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;

/** BaroCert의 네이버·카카오·토스 단건 PDF 전자서명을 코어 포트에 연결한다. */
@Component
@ConditionalOnProperty(
        prefix = "sodam.integration.electronic-signature",
        name = "mode",
        havingValue = "live")
public class LiveBarocertElectronicSignatureGateway implements ElectronicSignatureGateway {
    private static final String TOKEN_TYPE_PDF = "PDF";

    private final IntegrationProperties.ElectronicSignature config;
    private final ElectronicSignatureProvider provider;
    private final String allowedReturnScheme;
    private final NavercertService navercert;
    private final KakaocertService kakaocert;
    private final TosscertService tosscert;

    public LiveBarocertElectronicSignatureGateway(IntegrationProperties properties) {
        this.config = properties.getElectronicSignature();
        this.provider = ElectronicSignatureProvider.parse(config.getProvider());
        this.allowedReturnScheme =
                MockElectronicSignatureGateway.validateAllowedScheme(config.getAllowedReturnScheme());

        NavercertServiceImp naver = new NavercertServiceImp();
        KakaocertServiceImp kakao = new KakaocertServiceImp();
        TosscertServiceImp toss = new TosscertServiceImp();
        configure(naver);
        configure(kakao);
        configure(toss);
        this.navercert = naver;
        this.kakaocert = kakao;
        this.tosscert = toss;
    }

    @PostConstruct
    void validateLiveConfiguration() {
        requireSecret("link-id", config.getLinkId());
        requireSecret("secret-key", config.getSecretKey());
        requireSecret("client-code", config.getClientCode());
        if (config.getClientCode().trim().length() != 12) {
            throw new IllegalStateException("전자서명 client-code는 12자리여야 합니다.");
        }
        if (provider == ElectronicSignatureProvider.NAVER) {
            requireSecret("call-center-number", config.getCallCenterNumber());
        }
    }

    @Override
    public ElectronicSignatureProvider provider() {
        return provider;
    }

    @Override
    public ElectronicSignatureReceipt request(ElectronicSignatureRequest request) {
        requireConfiguredProvider(request.provider());
        validateReturnScheme(request);
        try {
            return switch (provider) {
                case NAVER -> requestNaver(request);
                case KAKAO -> requestKakao(request);
                case TOSS -> requestToss(request);
            };
        } catch (BarocertException e) {
            throw integrationFailure(e);
        }
    }

    @Override
    public ElectronicSignatureStatus getStatus(String receiptId) {
        requireReceiptId(receiptId);
        try {
            return switch (provider) {
                case NAVER -> statusNaver(receiptId);
                case KAKAO -> statusKakao(receiptId);
                case TOSS -> statusToss(receiptId);
            };
        } catch (BarocertException e) {
            throw integrationFailure(e);
        }
    }

    @Override
    public ElectronicSignatureVerification verify(String receiptId) {
        requireReceiptId(receiptId);
        try {
            return switch (provider) {
                case NAVER -> verifyNaver(receiptId);
                case KAKAO -> verifyKakao(receiptId);
                case TOSS -> verifyToss(receiptId);
            };
        } catch (BarocertException e) {
            throw integrationFailure(e);
        }
    }

    private ElectronicSignatureReceipt requestNaver(ElectronicSignatureRequest request)
            throws BarocertException {
        SignerIdentity signer = request.signer();
        com.barocert.navercert.sign.Sign sign = new com.barocert.navercert.sign.Sign();
        sign.setReceiverHP(navercert.encrypt(signer.phone()));
        sign.setReceiverName(navercert.encrypt(signer.name()));
        sign.setReceiverBirthday(navercert.encrypt(signer.birthday()));
        sign.setReqTitle(request.title());
        sign.setReqMessage(navercert.encrypt(request.message()));
        sign.setCallCenterNum(request.callCenterNumber());
        sign.setExpireIn(request.expiresInSeconds());
        sign.setToken(request.documentDigest().base64Url());
        sign.setTokenType(TOKEN_TYPE_PDF);
        applyNaverAppOptions(sign, request);

        com.barocert.navercert.sign.SignReceipt receipt =
                navercert.requestSign(config.getClientCode(), sign);
        return new ElectronicSignatureReceipt(
                receipt.getReceiptID(), receipt.getScheme(), receipt.getMarketUrl());
    }

    private ElectronicSignatureReceipt requestKakao(ElectronicSignatureRequest request)
            throws BarocertException {
        SignerIdentity signer = request.signer();
        com.barocert.kakaocert.sign.Sign sign = new com.barocert.kakaocert.sign.Sign();
        sign.setReceiverHP(kakaocert.encrypt(signer.phone()));
        sign.setReceiverName(kakaocert.encrypt(signer.name()));
        sign.setReceiverBirthday(kakaocert.encrypt(signer.birthday()));
        sign.setSignTitle(request.title());
        if (request.message() != null) sign.setExtraMessage(kakaocert.encrypt(request.message()));
        sign.setExpireIn(request.expiresInSeconds());
        sign.setToken(request.documentDigest().base64Url());
        sign.setTokenType(TOKEN_TYPE_PDF);
        sign.setAppUseYN(request.appToApp());
        if (request.appToApp()) sign.setReturnURL(request.returnUrl());
        sign.setIdentifyItems(List.of("NAME", "BIRTHDAY", "PHONE_NUMBER"));

        com.barocert.kakaocert.sign.SignReceipt receipt =
                kakaocert.requestSign(config.getClientCode(), sign);
        return new ElectronicSignatureReceipt(receipt.getReceiptID(), receipt.getScheme(), null);
    }

    private ElectronicSignatureReceipt requestToss(ElectronicSignatureRequest request)
            throws BarocertException {
        SignerIdentity signer = request.signer();
        com.barocert.tosscert.sign.Sign sign = new com.barocert.tosscert.sign.Sign();
        sign.setReceiverHP(tosscert.encrypt(signer.phone()));
        sign.setReceiverName(tosscert.encrypt(signer.name()));
        sign.setReceiverBirthday(tosscert.encrypt(signer.birthday()));
        sign.setReqTitle(request.title());
        sign.setExpireIn(request.expiresInSeconds());
        sign.setToken(request.documentDigest().base64Url());
        sign.setTokenType(TOKEN_TYPE_PDF);
        applyTossAppOptions(sign, request);

        com.barocert.tosscert.sign.SignReceipt receipt =
                tosscert.requestSign(config.getClientCode(), sign);
        return new ElectronicSignatureReceipt(
                receipt.getReceiptID(), receipt.getScheme(), receipt.getMarketUrl());
    }

    private ElectronicSignatureStatus statusNaver(String receiptId) throws BarocertException {
        com.barocert.navercert.sign.SignStatus status =
                navercert.getSignStatus(config.getClientCode(), receiptId);
        return new ElectronicSignatureStatus(
                BarocertResponseMapper.status(provider, status.getState()),
                null,
                null,
                null,
                BarocertResponseMapper.instant(status.getExpireDT()));
    }

    private ElectronicSignatureStatus statusKakao(String receiptId) throws BarocertException {
        com.barocert.kakaocert.sign.SignStatus status =
                kakaocert.getSignStatus(config.getClientCode(), receiptId);
        return new ElectronicSignatureStatus(
                BarocertResponseMapper.status(provider, status.getState()),
                BarocertResponseMapper.instant(status.getRequestDT()),
                BarocertResponseMapper.instant(status.getViewDT()),
                BarocertResponseMapper.instant(status.getCompleteDT()),
                BarocertResponseMapper.instant(status.getExpireDT()));
    }

    private ElectronicSignatureStatus statusToss(String receiptId) throws BarocertException {
        com.barocert.tosscert.sign.SignStatus status =
                tosscert.getSignStatus(config.getClientCode(), receiptId);
        return new ElectronicSignatureStatus(
                BarocertResponseMapper.status(provider, status.getState()),
                null,
                null,
                null,
                BarocertResponseMapper.instant(status.getExpireDT()));
    }

    private ElectronicSignatureVerification verifyNaver(String receiptId) throws BarocertException {
        com.barocert.navercert.sign.SignResult result =
                navercert.verifySign(config.getClientCode(), receiptId);
        return new ElectronicSignatureVerification(
                BarocertResponseMapper.status(provider, result.getState()),
                identity(result.getReceiverName(), result.getReceiverHP(),
                        result.getReceiverYear(), result.getReceiverDay()),
                result.getSignedData());
    }

    private ElectronicSignatureVerification verifyKakao(String receiptId) throws BarocertException {
        com.barocert.kakaocert.sign.SignResult result =
                kakaocert.verifySign(config.getClientCode(), receiptId);
        return new ElectronicSignatureVerification(
                BarocertResponseMapper.status(provider, result.getState()),
                identity(result.getReceiverName(), result.getReceiverHP(),
                        result.getReceiverYear(), result.getReceiverDay()),
                result.getSignedData());
    }

    private ElectronicSignatureVerification verifyToss(String receiptId) throws BarocertException {
        com.barocert.tosscert.sign.SignResult result =
                tosscert.verifySign(config.getClientCode(), receiptId);
        return new ElectronicSignatureVerification(
                BarocertResponseMapper.tossVerificationStatus(result.getState()),
                identity(result.getReceiverName(), result.getReceiverHP(),
                        result.getReceiverYear(), result.getReceiverDay()),
                result.getSignedData());
    }

    private void applyNaverAppOptions(
            com.barocert.navercert.sign.Sign sign, ElectronicSignatureRequest request) {
        sign.setAppUseYN(request.appToApp());
        if (!request.appToApp()) return;
        sign.setDeviceOSType(request.deviceOs().name());
        sign.setReturnURL(request.returnUrl());
    }

    private void applyTossAppOptions(
            com.barocert.tosscert.sign.Sign sign, ElectronicSignatureRequest request) {
        sign.setAppUseYN(request.appToApp());
        if (!request.appToApp()) return;
        sign.setDeviceOSType(request.deviceOs().name());
        sign.setReturnURL(request.returnUrl());
    }

    private VerifiedSignerIdentity identity(String name, String phone, String year, String day) {
        try {
            return new VerifiedSignerIdentity(name, phone, year + day);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private void configure(ServiceImpBase service) {
        service.setLinkID(config.getLinkId());
        service.setSecretKey(config.getSecretKey());
        service.setIPRestrictOnOff(config.isIpRestrict());
        service.setUseStaticIP(config.isUseStaticIp());
    }

    private void validateReturnScheme(ElectronicSignatureRequest request) {
        if (!request.appToApp()) return;
        String scheme = URI.create(request.returnUrl()).getScheme();
        if (!allowedReturnScheme.equalsIgnoreCase(scheme)) {
            throw new IllegalArgumentException("허용되지 않은 앱 복귀 스킴입니다.");
        }
    }

    private void requireConfiguredProvider(ElectronicSignatureProvider requestedProvider) {
        if (provider != requestedProvider) {
            throw new IllegalArgumentException("설정된 전자서명 공급자와 요청 공급자가 다릅니다.");
        }
    }

    private void requireReceiptId(String receiptId) {
        if (receiptId == null || !receiptId.matches("[A-Za-z0-9]{32}")) {
            throw new IllegalArgumentException("전자서명 접수 ID가 올바르지 않습니다.");
        }
    }

    private void requireSecret(String name, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    "전자서명 live 모드 필수 설정이 없습니다: " + name);
        }
    }

    private ElectronicSignatureIntegrationException integrationFailure(BarocertException cause) {
        return new ElectronicSignatureIntegrationException(provider, cause.getCode());
    }
}

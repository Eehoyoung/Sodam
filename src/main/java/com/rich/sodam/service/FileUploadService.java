package com.rich.sodam.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

/**
 * 파일 업로드 서비스
 * 이미지 파일 업로드 기능을 제공하는 서비스입니다.
 */
@Service
public class FileUploadService {

    @Value("${file.upload.directory:uploads}")
    private String uploadDirectory;

    // 허용되는 이미지 파일 확장자
    private static final Set<String> ALLOWED_EXTENSIONS = new HashSet<>(
            Arrays.asList(".jpg", ".jpeg", ".png", ".gif", ".bmp"));
    // 이미지 압축 품질 (0.0 ~ 1.0)
    private static final float IMAGE_COMPRESSION_QUALITY = 0.7f;
    // 동시 파일 작업을 위한 락
    private final ReentrantLock fileLock = new ReentrantLock();
    @Value("${file.upload.max-size:5242880}") // 기본값 5MB
    private long maxFileSize;

    /**
     * 이미지 파일 업로드
     * 서버 비용 최적화를 위해 파일 크기 제한, 타입 검증, 이미지 압축 기능 추가
     *
     * @param file 업로드할 이미지 파일
     * @return 저장된 파일 경로
     * @throws IOException 파일 저장 중 오류 발생 시
     * @throws IllegalArgumentException 파일 크기 초과 또는 지원하지 않는 파일 형식일 경우
     */
    public String uploadImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }

        // 파일 크기 검증
        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException("파일 크기가 허용된 최대 크기(" + (maxFileSize / 1024 / 1024) + "MB)를 초과했습니다.");
        }

        // 파일 확장자 검증
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("지원하지 않는 파일 형식입니다. 지원되는 형식: " + ALLOWED_EXTENSIONS);
        }

        // 파일명 중복 방지를 위한 UUID 생성
        String newFilename = UUID.randomUUID().toString() + extension;

        // 이미지 압축 및 저장
        byte[] compressedImageData = compressImage(file.getBytes(), extension.substring(1));

        // 동시성 제어를 위한 락 사용
        fileLock.lock();
        try {
            // 업로드 디렉토리 생성
            File directory = new File(uploadDirectory);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            // 파일 저장 경로 생성
            Path filePath = Paths.get(uploadDirectory, newFilename);

            // 압축된 이미지 저장 (try-with-resources 사용)
            try (ByteArrayInputStream bis = new ByteArrayInputStream(compressedImageData)) {
                Files.copy(bis, filePath, StandardCopyOption.REPLACE_EXISTING);
            }

            return filePath.toString();
        } finally {
            fileLock.unlock();
        }
    }

    /**
     * 이미지 압축
     * 서버 스토리지 비용 절감을 위한 이미지 압축 기능
     *
     * @param imageData  원본 이미지 데이터
     * @param formatName 이미지 포맷 (jpg, png 등)
     * @return 압축된 이미지 데이터
     * @throws IOException 이미지 처리 중 오류 발생 시
     */
    private byte[] compressImage(byte[] imageData, String formatName) throws IOException {
        // gif 파일은 압축하지 않음 (압축 시 애니메이션 손실 가능성)
        if ("gif".equalsIgnoreCase(formatName)) {
            return imageData;
        }

        try (ByteArrayInputStream bis = new ByteArrayInputStream(imageData);
             ByteArrayOutputStream bos = new ByteArrayOutputStream()) {

            // 이미지 읽기
            BufferedImage image = ImageIO.read(bis);
            if (image == null) {
                return imageData; // 이미지를 읽을 수 없는 경우 원본 반환
            }

            // 이미지 압축
            ImageWriter writer = ImageIO.getImageWritersByFormatName(formatName).next();
            ImageWriteParam param = writer.getDefaultWriteParam();

            // jpg 형식만 압축률 조정 가능
            if (param.canWriteCompressed() && "jpg".equalsIgnoreCase(formatName) || "jpeg".equalsIgnoreCase(formatName)) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(IMAGE_COMPRESSION_QUALITY);
            }

            try (ImageOutputStream ios = ImageIO.createImageOutputStream(bos)) {
                writer.setOutput(ios);
                writer.write(null, new IIOImage(image, null, null), param);
                writer.dispose();
            }

            return bos.toByteArray();
        }
    }

    /**
     * 파일 삭제
     * 서버 리소스 최적화를 위한 동시성 제어 및 예외 처리 개선
     *
     * @param filePath 삭제할 파일 경로
     * @return 삭제 성공 여부
     */
    public boolean deleteFile(String filePath) {
        if (filePath == null || filePath.isEmpty()) {
            return false;
        }

        // 동시성 제어를 위한 락 사용
        fileLock.lock();
        try {
            Path path = Paths.get(filePath);
            return Files.deleteIfExists(path);
        } catch (IOException e) {
            // 로깅 추가 (실제 구현 시 로깅 프레임워크 사용 권장)
            System.err.println("파일 삭제 중 오류 발생: " + e.getMessage());
            return false;
        } finally {
            fileLock.unlock();
        }
    }
}

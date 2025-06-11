package com.rich.sodam.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * 파일 업로드 서비스
 * 이미지 파일 업로드 기능을 제공하는 서비스입니다.
 */
@Service
public class FileUploadService {

    @Value("${file.upload.directory:uploads}")
    private String uploadDirectory;

    /**
     * 이미지 파일 업로드
     *
     * @param file 업로드할 이미지 파일
     * @return 저장된 파일 경로
     * @throws IOException 파일 저장 중 오류 발생 시
     */
    public String uploadImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }

        // 업로드 디렉토리 생성
        File directory = new File(uploadDirectory);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        // 파일명 중복 방지를 위한 UUID 생성
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String newFilename = UUID.randomUUID().toString() + extension;

        // 파일 저장 경로 생성
        Path filePath = Paths.get(uploadDirectory, newFilename);

        // 파일 저장
        Files.write(filePath, file.getBytes());

        return filePath.toString();
    }

    /**
     * 파일 삭제
     *
     * @param filePath 삭제할 파일 경로
     * @return 삭제 성공 여부
     */
    public boolean deleteFile(String filePath) {
        if (filePath == null || filePath.isEmpty()) {
            return false;
        }

        try {
            Path path = Paths.get(filePath);
            return Files.deleteIfExists(path);
        } catch (IOException e) {
            return false;
        }
    }
}

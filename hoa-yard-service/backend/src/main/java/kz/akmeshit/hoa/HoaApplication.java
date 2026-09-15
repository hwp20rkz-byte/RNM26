package kz.akmeshit.hoa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class HoaApplication {
    public static void main(String[] args) {
        SpringApplication.run(HoaApplication.class, args);
    }
}

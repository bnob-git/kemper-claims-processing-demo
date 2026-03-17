package com.pnc.claims.controller;

import com.pnc.claims.service.ChatBotService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatBotService chatBotService;

    public ChatController(ChatBotService chatBotService) {
        this.chatBotService = chatBotService;
    }

    @PostMapping
    public ChatResponse chat(@RequestBody ChatRequest request) {
        return chatBotService.processMessage(request.getMessage());
    }
}

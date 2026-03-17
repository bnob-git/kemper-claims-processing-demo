package com.pnc.claims.controller;

import java.util.List;

public class ChatResponse {

    private String reply;
    private Object data;
    private List<String> suggestions;

    public ChatResponse() {}

    public ChatResponse(String reply, Object data, List<String> suggestions) {
        this.reply = reply;
        this.data = data;
        this.suggestions = suggestions;
    }

    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }

    public Object getData() { return data; }
    public void setData(Object data) { this.data = data; }

    public List<String> getSuggestions() { return suggestions; }
    public void setSuggestions(List<String> suggestions) { this.suggestions = suggestions; }
}

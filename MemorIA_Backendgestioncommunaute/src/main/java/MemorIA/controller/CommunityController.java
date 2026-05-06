package MemorIA.controller;

import MemorIA.entity.community.Community;
import MemorIA.entity.User;
import MemorIA.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** REST controller for communities - no auth; pass userId in request params */
@RestController
@RequestMapping("/communities")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @PostMapping
    public Community create(@RequestBody Community community, @RequestParam("userId") Long userId) {
        return communityService.create(community, userId);
    }

    @GetMapping
    public List<Community> findAll(@RequestParam("userId") Long userId) {
        return communityService.findAll(userId);
    }

    /** My joined groups */
    @GetMapping("/my-groups")
    public List<Community> myGroups(@RequestParam("userId") Long userId) {
        return communityService.findUserGroups(userId);
    }

    @PostMapping("/{id}/join")
    public void join(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        communityService.join(id, userId);
    }

    @PostMapping("/{id}/leave")
    public void leave(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        communityService.leave(id, userId);
    }

    @PutMapping("/{id}/block")
    public void block(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        communityService.block(id, userId);
    }

    @PutMapping("/{id}/unblock")
    public void unblock(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        communityService.unblock(id, userId);
    }

    @PutMapping("/{id}")
    public Community update(@PathVariable("id") Long id, @RequestBody Community community, @RequestParam("userId") Long userId) {
        return communityService.update(id, community, userId);
    }

    @PostMapping("/{id}/add-member")
    public void addMember(@PathVariable("id") Long id, @RequestParam("memberId") Long memberId, @RequestParam("creatorId") Long creatorId) {
        communityService.addMember(id, memberId, creatorId);
    }

    @PostMapping("/{id}/remove-member")
    public void removeMember(@PathVariable("id") Long id, @RequestParam("memberId") Long memberId, @RequestParam("creatorId") Long creatorId) {
        communityService.removeMember(id, memberId, creatorId);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        communityService.delete(id, userId);
    }

    @PutMapping("/{id}/archive")
    public void archive(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        communityService.archive(id, userId);
    }

    @PutMapping("/{id}/unarchive")
    public void unarchive(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        communityService.unarchive(id, userId);
    }

    @GetMapping("/stats")
    public java.util.Map<String, Object> getStats() {
        return communityService.getCommunityStats();
    }

    @GetMapping("/caregivers")
    public List<User> getCaregivers(@RequestParam(value = "all", required = false) Boolean all) {
        if (Boolean.TRUE.equals(all)) {
            return communityService.findAllUsers();
        }
        return communityService.findAllCaregivers();
    }

    @GetMapping("/search")
    public List<Community> search(@RequestParam("query") String query, @RequestParam("userId") Long userId) {
        return communityService.search(query, userId);
    }
}

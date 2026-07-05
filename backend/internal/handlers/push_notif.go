package handlers

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

// Demo VAPID public key — in production generate with: npx web-push generate-vapid-keys
const vapidPublicKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"

type pushSubscriptionKeys struct {
	P256dh string `json:"p256dh"`
	Auth   string `json:"auth"`
}

type pushSubscription struct {
	Endpoint string               `json:"endpoint"`
	Keys     pushSubscriptionKeys `json:"keys"`
}

type pushMessage struct {
	Title            string `json:"title"`
	Body             string `json:"body"`
	URL              string `json:"url"`
	Tag              string `json:"tag"`
	RequireInteraction bool  `json:"require_interaction"`
}

var (
	pushSubs   = make(map[string]*pushSubscription)
	pushSubsMu sync.RWMutex
)

func GetVAPIDKey(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"public_key": vapidPublicKey})
}

func SubscribePush(c *gin.Context) {
	var sub pushSubscription
	if err := c.ShouldBindJSON(&sub); err != nil || sub.Endpoint == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subscription payload"})
		return
	}

	userID := extractUserID(c)
	pushSubsMu.Lock()
	pushSubs[userID] = &sub
	pushSubsMu.Unlock()

	c.JSON(http.StatusOK, gin.H{"message": "Subscribed", "user_id": userID})
}

func UnsubscribePush(c *gin.Context) {
	userID := extractUserID(c)
	pushSubsMu.Lock()
	delete(pushSubs, userID)
	pushSubsMu.Unlock()
	c.JSON(http.StatusOK, gin.H{"message": "Unsubscribed"})
}

func GetPushStatus(c *gin.Context) {
	userID := extractUserID(c)
	pushSubsMu.RLock()
	_, subscribed := pushSubs[userID]
	total := len(pushSubs)
	pushSubsMu.RUnlock()
	c.JSON(http.StatusOK, gin.H{"subscribed": subscribed, "total_subscribers": total})
}

func SendPushNotification(c *gin.Context) {
	var msg pushMessage
	if err := c.ShouldBindJSON(&msg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message payload"})
		return
	}
	if msg.Title == "" {
		msg.Title = "Smart Enterprise Platform"
	}
	if msg.Body == "" {
		msg.Body = "Ada notifikasi baru dari sistem"
	}

	pushSubsMu.RLock()
	count := len(pushSubs)
	pushSubsMu.RUnlock()

	// Demo: actual sending requires VAPID signing + HTTP POST to push endpoints
	// In production use github.com/SherClockHolmes/webpush-go
	c.JSON(http.StatusOK, gin.H{
		"message":    "Push notification queued",
		"sent_to":    count,
		"demo_note":  "Demo mode: actual push delivery requires webpush-go with VAPID signing",
		"title":      msg.Title,
		"body":       msg.Body,
	})
}

func extractUserID(c *gin.Context) string {
	if claims, ok := c.Get("claims"); ok {
		if m, ok := claims.(map[string]interface{}); ok {
			if uid, ok := m["user_id"]; ok {
				return fmt.Sprintf("%v", uid)
			}
		}
	}
	return "demo-user"
}

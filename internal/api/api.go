package api

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/igorhnq/ask-me-anything/internal/store/pgstore"
	"github.com/jackc/pgx/v5"
)

type apiHandler struct {
	q *pgstore.Queries
	r *chi.Mux
	upgrader websocket.Upgrader
	subscribers map[string]map[*websocket.Conn]context.CancelFunc
	mu *sync.Mutex
}

func (h apiHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.r.ServeHTTP(w, r)
}

func NewHandler(q *pgstore.Queries) http.Handler {
	a := apiHandler{
		q: q,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
		subscribers: make(map[string]map[*websocket.Conn]context.CancelFunc),
		mu: &sync.Mutex{},
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.Recoverer, middleware.Logger)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"https://*", "http://*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders: []string{"Link"},
		AllowCredentials: false,
		MaxAge: 300,
	}))

	r.Get("/subscribe/{roomId}", a.handleSubscribe)

	r.Route("/api", func(r chi.Router) {
		r.Route("/rooms", func(r chi.Router) {
			r.Post("/", a.handleCreateRoom)
			r.Get("/", a.handleGetRooms)

			r.Route("/{roomId}/messages", func(r chi.Router) {
				r.Post("/", a.handleCreateMessage)
				r.Get("/", a.handleGetRoomMessages)

				r.Route("/{messageId}", func(r chi.Router) {
					r.Get("/", a.handleGetRoomMessage)
					r.Patch("/react", a.handleReactToMessage)
					r.Delete("/react", a.handleRemoveReactionFromMessage)
					r.Patch("/answer", a.handleMarkMessageAsAnswered)
				})
			})
		})
	})

	a.r = r
	return a
}

func (h apiHandler) handleSubscribe(w http.ResponseWriter, r *http.Request) {
	rawRoomID := chi.URLParam(r, "room_id")
	roomID, err := uuid.Parse(rawRoomID)

	if err != nil {
		http.Error(w, "invalid room id", http.StatusBadRequest)
		return
	}

	_, err = h.q.GetRoom(r.Context(), roomID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "room not found", http.StatusNotFound)
			return
		}

		http.Error(w, "internal server error", http.StatusInternalServerError)
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Warn("failed to upgrade to websocket", "error", err)
		http.Error(w, "failed to upgrade to ws conection", http.StatusBadRequest)
		return
	}

	defer conn.Close()

	ctx, cancel := context.WithCancel(r.Context())

	h.mu.Lock()
	if _, ok := h.subscribers[rawRoomID]; !ok {
		h.subscribers[rawRoomID] = make(map[*websocket.Conn]context.CancelFunc)
	}
	slog.Info("new client connected", "room_id", rawRoomID, "client_ip", r.RemoteAddr)
	h.subscribers[rawRoomID][conn] = cancel
	h.mu.Unlock()

	<-ctx.Done()

	h.mu.Lock()
	delete(h.subscribers[rawRoomID], conn)
	h.mu.Unlock()	
}

func (a apiHandler) handleCreateRoom(w http.ResponseWriter, r *http.Request)      {}
func (a apiHandler) handleGetRooms(w http.ResponseWriter, r *http.Request)        {}
func (a apiHandler) handleGetRoomMessages(w http.ResponseWriter, r *http.Request) {}
func (a apiHandler) handleCreateMessage(w http.ResponseWriter, r *http.Request)   {}
func (a apiHandler) handleGetRoomMessage(w http.ResponseWriter, r *http.Request)   {}
func (a apiHandler) handleReactToMessage(w http.ResponseWriter, r *http.Request)   {}
func (a apiHandler) handleRemoveReactionFromMessage(w http.ResponseWriter, r *http.Request) {}
func (a apiHandler) handleMarkMessageAsAnswered(w http.ResponseWriter, r *http.Request) {}
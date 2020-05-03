package api

import (
	pb "github.com/robbdimitrov/thoughts/src/apiservice/genproto"
)

func mapUser(u *pb.User) user {
	return user{
		id:        u.Id,
		name:      u.Name,
		username:  u.Username,
		email:     u.Email,
		avatar:    u.Avatar,
		bio:       u.Bio,
		posts:     u.Posts,
		likes:     u.Likes,
		following: u.Following,
		followers: u.Followers,
		followed:  u.Followed,
		created:   u.Created,
	}
}

func mapPost(p *pb.Post) post {
	return post{
		id:        p.Id,
		userID:    p.UserId,
		content:   p.Content,
		likes:     p.Likes,
		liked:     p.Liked,
		retweets:  p.Retweets,
		retweeted: p.Retweeted,
		created:   p.Created,
	}
}

func mapSession(s *pb.Session) session {
	return session{
		id:      s.Id,
		userID:  s.UserId,
		created: s.Created,
	}
}

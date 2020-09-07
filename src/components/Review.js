import React, { useState } from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from '@material-ui/core'
import {
  MoreVert,
  Favorite,
  FavoriteBorder,
  Star,
  StarBorder,
} from '@material-ui/icons'
import formatDistanceToNow from 'date-fns/formatDistanceToNow'
import times from 'lodash/times'
import { gql, useMutation } from '@apollo/client'

import { REVIEWS_QUERY } from '../graphql/Review'

const FAVORITE_REVIEW_MUTATION = gql`
  mutation FavoriteReview($id: ObjID!, $favorite: Boolean!) {
    favoriteReview(id: $id, favorite: $favorite) {
      id
      favorited
    }
  }
`

const READ_USER_FAVORITES = gql`
  query ReadUserFavorites {
    currentUser {
      id
      favoriteReviews {
        id
      }
    }
  }
`

const FavoriteButton = ({ id, favorited }) => {
  const [favorite] = useMutation(FAVORITE_REVIEW_MUTATION, {
    update: (cache, { data: { favoriteReview } }) => {
      const { currentUser } = cache.readQuery({ query: READ_USER_FAVORITES })
      let newUser

      if (favoriteReview.favorited) {
        newUser = {
          ...currentUser,
          favoriteReviews: [
            ...currentUser.favoriteReviews,
            { id, __typename: 'Review' },
          ],
        }
      } else {
        newUser = {
          ...currentUser,
          favoriteReviews: currentUser.favoriteReviews.filter(
            (review) => review.id !== id
          ),
        }
      }

      cache.writeQuery({
        query: READ_USER_FAVORITES,
        data: { currentUser: newUser },
      })
    },
  })

  function toggleFavorite() {
    favorite({
      variables: { id, favorite: !favorited },
      optimisticResponse: {
        favoriteReview: {
          __typename: 'Review',
          id,
          favorited: !favorited,
        },
      },
    })
  }

  return (
    <IconButton onClick={toggleFavorite}>
      {favorited ? <Favorite /> : <FavoriteBorder />}
    </IconButton>
  )
}

const StarRating = ({ rating }) => (
  <div>
    {times(rating, (i) => (
      <Star key={i} />
    ))}
    {times(5 - rating, (i) => (
      <StarBorder key={i} />
    ))}
  </div>
)

const REMOVE_REVIEW_MUTATION = gql`
  mutation RemoveReview($id: ObjID!) {
    removeReview(id: $id)
  }
`

export default ({ review }) => {
  const { id, text, stars, createdAt, author } = review

  const [anchorEl, setAnchorEl] = useState()
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)

  const [removeReview] = useMutation(REMOVE_REVIEW_MUTATION, {
    update: (cache) => {
      const { reviews } = cache.readQuery({ query: REVIEWS_QUERY })
      cache.writeQuery({
        query: REVIEWS_QUERY,
        data: { reviews: reviews.filter((review) => review.id !== id) },
      })

      const { currentUser } = cache.readQuery({ query: READ_USER_FAVORITES })
      cache.writeQuery({
        query: READ_USER_FAVORITES,
        data: {
          currentUser: {
            ...currentUser,
            favoriteReviews: currentUser.favoriteReviews.filter(
              (review) => review.id !== id
            ),
          },
        },
      })
    },
  })

  function openMenu(event) {
    setAnchorEl(event.currentTarget)
  }

  function closeMenu() {
    setAnchorEl(null)
  }

  function editReview() {
    closeMenu()
  }

  function deleteReview() {
    closeMenu()
    removeReview({
      variables: { id },
      optimisticResponse: {
        removeReview: true,
      },
    })
  }

  const LinkToProfile = ({ children }) => (
    <a
      href={`https://github.com/${author.username}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  )

  return (
    <div>
      <Card className="Review">
        <CardHeader
          avatar={
            <LinkToProfile>
              <Avatar alt={author.name} src={author.photo} />
            </LinkToProfile>
          }
          action={
            <IconButton onClick={openMenu}>
              <MoreVert />
            </IconButton>
          }
          title={<LinkToProfile>{author.name}</LinkToProfile>}
          subheader={stars && <StarRating rating={stars} />}
        />
        <CardContent>
          <Typography component="p">{text}</Typography>
        </CardContent>
        <CardActions>
          <Typography className="Review-created">
            {formatDistanceToNow(createdAt)} ago
          </Typography>
          <div className="Review-spacer" />
          <FavoriteButton {...review} />
        </CardActions>
      </Card>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        <MenuItem onClick={editReview}>Edit</MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            setDeleteConfirmationOpen(true)
          }}
        >
          Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={deleteConfirmationOpen}
        onClose={() => setDeleteConfirmationOpen(false)}
      >
        <DialogTitle>{'Delete review?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            A better UX is probably just letting you single-click delete with an
            undo toast, but that's harder to code right{' '}
            <span role="img" aria-label="grinning face">
              😄
            </span>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmationOpen(false)}>
            Cancel
          </Button>
          <Button onClick={deleteReview} color="primary" autoFocus>
            Sudo delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

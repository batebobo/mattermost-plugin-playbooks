package sqlstore

import sq "github.com/Masterminds/squirrel"

func InsertRun(sqlStore *SQLStore, run map[string]interface{}) error {
	_, err := sqlStore.execBuilder(sqlStore.db, sq.
		Insert("IR_Incident").
		SetMap(run))

	return err
}

func InsertPost(sqlStore *SQLStore, id string, createdAt int64) error {
	_, err := sqlStore.execBuilder(sqlStore.db, sq.
		Insert("Posts").
		SetMap(map[string]interface{}{
			"Id":       id,
			"CreateAt": createdAt,
		}))

	return err
}

func InsertStatusPost(sqlStore *SQLStore, incidentID, postID string) error {
	_, err := sqlStore.execBuilder(sqlStore.db, sq.
		Insert("IR_StatusPosts").
		SetMap(map[string]interface{}{
			"IncidentID": incidentID,
			"PostID":     postID,
		}))

	return err
}

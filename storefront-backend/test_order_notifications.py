"""Storefront trigger regression; only an explicit local *_test database."""
import os
if os.environ.get('PGHOST') != '127.0.0.1' or not os.environ.get('PGDATABASE','').endswith('_test'):
    raise RuntimeError('Notification fixtures require a local *_test database')
import unittest
import db
import order_notification_schema as schema


class NotificationSchemaTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.ensure_database_ready()

    def setUp(self):
        with db._connect() as conn:
            conn.execute('TRUNCATE orders,store_users RESTART IDENTITY CASCADE')
            conn.execute("INSERT INTO store_users(name,company_name,email,password_hash,status) VALUES('Fixture','Fixture','fixture@voice.test','fixture-only','active')")

    def insert(self, conn, number='LM-FIXTURE'):
        return conn.execute("INSERT INTO orders(store_user_id,order_no,contact_name,phone,shipping_address,total_amount) "
                            "VALUES(1,%s,'Fixture','123','Fixture',0) RETURNING id",(number,)).fetchone()['id']

    def test_fresh_schema_atomic_collection_and_update_exclusion(self):
        with db._connect() as conn:
            self.insert(conn)
            conn.execute("UPDATE orders SET status='paid'")
            self.assertEqual(conn.execute('SELECT COUNT(*) AS n FROM order_created_events').fetchone()['n'],1)
        with db._connect() as conn:
            self.insert(conn,'LM-ROLLBACK');conn.rollback()
        with db._connect() as conn:
            self.assertEqual(conn.execute('SELECT COUNT(*) AS n FROM order_created_events').fetchone()['n'],1)

    def test_maintenance_repeat_migrations_do_not_capture_history_or_reset_progress(self):
        with db._connect() as conn:
            conn.execute("SET LOCAL gingtto.notifications_paused='on'");self.insert(conn)
            conn.execute('UPDATE order_notification_state SET last_sequence=100')
            schema.migrate(conn.cursor());schema.migrate(conn.cursor())
            self.assertEqual(conn.execute('SELECT COUNT(*) AS n FROM order_created_events').fetchone()['n'],0)
            self.assertEqual(conn.execute('SELECT last_sequence FROM order_notification_state').fetchone()['last_sequence'],100)


if __name__ == '__main__': unittest.main()

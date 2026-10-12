"""Authenticated catalog and standalone migrations, isolated *_test fixtures only."""
import os
if os.environ.get('PGHOST')!='127.0.0.1' or not os.environ.get('PGDATABASE','').endswith('_test'):
    raise RuntimeError('Explicit local *_test database required')
import unittest
from unittest.mock import patch
from psycopg.types.json import Jsonb
import app as application
import db
import style_catalog


class StyleCatalogTest(unittest.TestCase):
    def setUp(self):
        with db._connect() as conn:
            conn.execute('TRUNCATE products,orders,store_users,product_categories RESTART IDENTITY CASCADE')
            conn.execute("UPDATE presale_configs SET style_codes='[]',sort_mode='automatic',version=0")
            conn.execute("INSERT INTO product_categories(category_key,sort_order) VALUES('tops',99),('pants',0)")
            conn.execute("INSERT INTO product_category_translations(category_id,lang_code,label) VALUES(1,'en','Tops'),(2,'en','Pants')")
            conn.execute("INSERT INTO store_users(name,email,password_hash,status) VALUES('Fixture','fixture@catalog.test','fixture-only','active')")
        self.add('STYLE-A','Black','2020-01-01',price=10,stock=0)
        self.add('STYLE-A','White','2025-01-01',price=12,stock=7)
        self.add('STYLE-B','Grey','2024-01-01',price=20,stock=5,category=2)
        self.session=patch.object(application,'load_sessions',return_value=[{'token':'fixture-catalog-token','userId':1}]);self.session.start();self.addCleanup(self.session.stop)

    def add(self,style,color,date,price=10,stock=5,category=1,active=True):
        with db._connect() as conn:
            row=conn.execute('INSERT INTO products(category_id,slug,sku,product_code,color_group,style_code,color_name,price,stock,main_image_url,is_active,created_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id',
                (category,style.lower()+'-'+color.lower(),style+'-'+color,style+'-'+color,style,style,color,price,stock,'/uploads/fixture.jpg',active,date+' 00:00:00+00')).fetchone()
            pid=row['id']
            conn.execute("INSERT INTO product_translations(product_id,lang_code,name,summary) VALUES(%s,'en','Identical title','100%% Cotton'),(%s,'zh','Identical title','100%% Cotton')",(pid,pid))
            conn.execute("INSERT INTO product_sizes(product_id,size_code,sort_order) VALUES(%s,'28/S',1),(%s,'Tall XL',2)",(pid,pid))
            conn.execute("INSERT INTO product_size_prices(product_id,size_code,price,stock,weight_grams,contract_pending,pending_inspection,pending_inbound,defective_pending,temporary_inbound) VALUES(%s,'28/S',%s,%s,350,10,4,2,1,3),(%s,'Tall XL',%s,0,NULL,0,0,0,0,0)",(pid,price,stock,pid,price))
        return pid

    def get(self,query='',path='/api/catalog/styles',auth=True):
        with application.app.test_client() as client:
            return client.get(path+('?'+query if query else ''),headers={'Authorization':'Bearer fixture-catalog-token'} if auth else {})

    def test_group_price_real_sizes_date_no_title_merge(self):
        data=self.get('lang=en').json
        self.assertEqual(data['total'],2)
        self.assertEqual([g['styleCode'] for g in data['items']],['STYLE-B','STYLE-A'])
        a=data['items'][1]
        self.assertEqual(len(a['variants']),2)
        self.assertEqual(a['sizeCodes'],['28/S','Tall XL'])
        self.assertEqual(a['priceRange'],{'min':10,'max':12})
        self.assertTrue(a['firstListedAt'].startswith('2020-01-01'))
        self.assertEqual(a['variants'][0]['stock'],0)
        # A legacy color without size-price rows still contributes its price.
        import style_catalog
        mixed = [dict(v) for v in a['variants']]
        mixed[1]['sizePrices'] = []
        mixed[1]['price'] = 30
        self.assertEqual(style_catalog.group_variants(mixed)[0]['priceRange'], {'min':10,'max':30})

    def test_color_search_and_instock_preserve_entire_group(self):
        for query in ('keyword=White','keyword=STYLE-A-Black','keyword=STYLE-A&stockOnly=1','category=tops'):
            data=self.get(query+'&lang=en').json
            self.assertEqual(data['total'],1,query)
            self.assertEqual(len(data['items'][0]['variants']),2,query)
        db._fetch_one('UPDATE product_size_prices SET stock=0 WHERE product_id IN(1,2) RETURNING id')
        self.assertEqual(self.get('stockOnly=1&lang=en').json['total'],1)

    def test_inactive_earliest_new_color_edit_and_reactivation_order(self):
        db._fetch_one('UPDATE products SET is_active=FALSE WHERE id=1 RETURNING id')
        self.add('STYLE-A','New','2026-01-01')
        data=self.get('lang=en').json
        self.assertEqual(data['items'][1]['styleCode'],'STYLE-A')
        self.assertTrue(data['items'][1]['firstListedAt'].startswith('2020-01-01'))
        db._fetch_one('UPDATE products SET updated_at=clock_timestamp(),is_active=TRUE WHERE id=1 RETURNING id')
        self.assertEqual(self.get('lang=en').json['items'][0]['styleCode'],'STYLE-B')

    def test_manual_auto_new_color_inclusion_and_all_inactive_hidden(self):
        with db._connect() as conn:
            conn.execute("UPDATE presale_configs SET style_codes=%s,sort_mode='manual'",(Jsonb(['STYLE-A','STYLE-B']),))
        self.add('STYLE-A','More','2026-01-01')
        data=self.get('section=presale&lang=en').json
        self.assertEqual([g['styleCode'] for g in data['items']],['STYLE-A','STYLE-B'])
        self.assertEqual(len(data['items'][0]['variants']),3)
        db._fetch_one("UPDATE presale_configs SET sort_mode='automatic' RETURNING id")
        self.assertEqual(self.get('section=presale').json['items'][0]['styleCode'],'STYLE-B')
        db._fetch_one("UPDATE products SET is_active=FALSE WHERE style_code='STYLE-A' RETURNING id")
        self.assertEqual(self.get('section=presale').json['total'],1)
        self.assertEqual(db._fetch_one('SELECT style_codes FROM presale_configs')['style_codes'],['STYLE-A','STYLE-B'])

    def test_empty_presale_and_repeat_migration(self):
        self.assertEqual(self.get('section=presale').json['total'],0)
        db._fetch_one("UPDATE presale_configs SET style_codes='[\"STYLE-A\"]',sort_mode='manual',version=8 RETURNING id")
        balances=db._fetch_all('SELECT * FROM product_size_prices ORDER BY id')
        db.ensure_database_ready();db.ensure_database_ready()
        self.assertEqual(db._fetch_one('SELECT version FROM presale_configs')['version'],8)
        self.assertEqual(db._fetch_all('SELECT * FROM product_size_prices ORDER BY id'),balances)

    def test_style_pages_never_split_colors_and_tie_is_stable(self):
        for i in range(13):self.add('P'+str(i),'Black','2026-01-01')
        first=self.get().json;second=self.get('page=2').json
        self.assertEqual(len(first['items']),12);self.assertEqual(len(second['items']),3)
        self.assertEqual(first['items'][0]['styleCode'],'P12')
        self.assertFalse({g['styleCode'] for g in first['items']} & {g['styleCode'] for g in second['items']})
        self.assertEqual(len(next(g for g in second['items'] if g['styleCode']=='STYLE-A')['variants']),2)

    def test_auth_boundary_params_private_fields_and_category(self):
        for path in ('/api/catalog/categories','/api/catalog/styles'):
            self.assertEqual(self.get(path=path,auth=False).status_code,401)
        for query in ('page=0','pageSize=20','section=unknown','page=no'):
            self.assertEqual(self.get(query).status_code,400)
        text=str(self.get().json)
        for field in ('weightGrams','contractPending','pendingInbound','defectivePending','temporaryInbound','overdeliveryUsed'):
            self.assertNotIn(field,text)
        self.assertEqual([c['key'] for c in self.get('lang=en',path='/api/catalog/categories').json['items']],['pants','tops'])

    def test_detail_switching_uses_same_identity_not_title(self):
        data=self.get('lang=en',path='/api/products/style-a-black').json
        self.assertEqual([v['id'] for v in data['product']['colorOptions']],[1,2])
        self.assertEqual([v['id'] for v in self.get('lang=en',path='/api/products/style-b-grey').json['product']['colorOptions']],[3])

    def test_checkout_unchanged_no_zero_stock_preorder(self):
        payload={'userId':1,'contactName':'Fixture','phone':'123456','country':'NL','shippingAddress':'Fixture Street',
                 'items':[{'productId':1,'sizeCode':'28/S','quantity':1}]}
        with self.assertRaises(RuntimeError):db.create_order(payload)
        payload['items'][0]['productId']=2
        order=db.create_order(payload)
        self.assertEqual(order['totalAmount'],12)
        self.assertEqual(db._fetch_one("SELECT stock FROM product_size_prices WHERE product_id=2 AND size_code='28/S'")['stock'],6)


if __name__=='__main__':unittest.main()

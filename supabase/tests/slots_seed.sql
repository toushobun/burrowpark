begin;
select plan(6);

select is(
  (select count(*) from public.slots where code not like 'test-%'),
  29::bigint,
  '正式车位共 29 条'
);
select is(
  (select count(*) from public.slots where code not like 'test-%' and yard = 'outer'),
  17::bigint,
  '外院共 17 条车位'
);
select is(
  (select count(*) from public.slots where code not like 'test-%' and yard = 'inner'),
  12::bigint,
  '里院共 12 条车位'
);
select is(
  (select count(*) from public.slots
    where code not like 'test-%' and (kind <> 'regular' or not is_active)),
  0::bigint,
  '全部正式车位均为 regular 且已启用'
);
select results_eq(
  $$select code, name, yard::text, sort_order
    from public.slots
    where code not like 'test-%'
    order by sort_order$$,
  $$select code, name, yard, sort_order
    from (values
      ('1', '1号', 'outer', 1),
      ('2', '2号', 'outer', 2),
      ('3', '3号', 'outer', 3),
      ('4', '4号', 'outer', 4),
      ('5', '5号', 'outer', 5),
      ('6', '6号', 'outer', 6),
      ('7', '7号', 'outer', 7),
      ('8', '8号', 'outer', 8),
      ('9', '9号', 'outer', 9),
      ('10', '10号', 'outer', 10),
      ('11', '11号', 'outer', 11),
      ('12', '12号', 'outer', 12),
      ('13', '13号', 'outer', 13),
      ('14', '14号', 'outer', 14),
      ('15', '15号', 'outer', 15),
      ('16', '16号', 'outer', 16),
      ('17', '17号', 'outer', 17),
      ('18', '18号', 'inner', 18),
      ('19', '19号', 'inner', 19),
      ('20', '20号', 'inner', 20),
      ('21', '21号', 'inner', 21),
      ('22', '22号', 'inner', 22),
      ('23', '23号', 'inner', 23),
      ('24', '24号', 'inner', 24),
      ('25', '25号', 'inner', 25),
      ('26', '26号', 'inner', 26),
      ('27', '27号', 'inner', 27),
      ('28', '28号', 'inner', 28),
      ('29', '29号', 'inner', 29)
    ) as expected (code, name, yard, sort_order)
    order by sort_order$$,
  '正式车位 code、name、yard、sort_order 与定稿表一致'
);
select is(
  (select count(*) from (
    select sort_order
    from public.slots
    where code not like 'test-%'
    group by sort_order
    having count(*) > 1
  ) as duplicates),
  0::bigint,
  '正式车位 sort_order 不重复'
);

select * from finish();
rollback;

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_signatures; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.account_signatures (
    signature_id integer NOT NULL,
    account_id integer NOT NULL,
    image_path character varying(255),
    feature_vector text,
    is_primary boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.account_signatures OWNER TO chequemate_user;

--
-- Name: account_signatures_signature_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.account_signatures_signature_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.account_signatures_signature_id_seq OWNER TO chequemate_user;

--
-- Name: account_signatures_signature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.account_signatures_signature_id_seq OWNED BY public.account_signatures.signature_id;


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.accounts (
    account_id integer NOT NULL,
    bank_id integer NOT NULL,
    account_number character varying(20) NOT NULL,
    holder_name character varying(100) NOT NULL,
    account_type character varying(20) DEFAULT 'savings'::character varying,
    balance numeric(18,2) DEFAULT 0,
    status character varying(10) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.accounts OWNER TO chequemate_user;

--
-- Name: accounts_account_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.accounts_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_account_id_seq OWNER TO chequemate_user;

--
-- Name: accounts_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.accounts_account_id_seq OWNED BY public.accounts.account_id;


--
-- Name: banks; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.banks (
    bank_id integer NOT NULL,
    bank_code character varying(20) NOT NULL,
    bank_name character varying(100) NOT NULL,
    bank_type character varying(20) DEFAULT 'commercial'::character varying,
    routing_number character varying(20)
);


ALTER TABLE public.banks OWNER TO chequemate_user;

--
-- Name: banks_bank_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.banks_bank_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.banks_bank_id_seq OWNER TO chequemate_user;

--
-- Name: banks_bank_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.banks_bank_id_seq OWNED BY public.banks.bank_id;


--
-- Name: bb_clearings; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.bb_clearings (
    clearing_id integer NOT NULL,
    cheque_id integer NOT NULL,
    clearing_reference character varying(30),
    from_bank_id integer,
    to_bank_id integer,
    received_at timestamp with time zone DEFAULT now(),
    forwarded_at timestamp with time zone,
    blacklist_hit boolean DEFAULT false,
    blacklist_match_id integer,
    duplicate_hit boolean DEFAULT false,
    duplicate_of_cheque integer,
    stop_payment_hit boolean DEFAULT false,
    status character varying(15) DEFAULT 'pending'::character varying,
    response_status character varying(15),
    response_at timestamp with time zone
);


ALTER TABLE public.bb_clearings OWNER TO chequemate_user;

--
-- Name: bb_clearings_clearing_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.bb_clearings_clearing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bb_clearings_clearing_id_seq OWNER TO chequemate_user;

--
-- Name: bb_clearings_clearing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.bb_clearings_clearing_id_seq OWNED BY public.bb_clearings.clearing_id;


--
-- Name: blacklist; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.blacklist (
    blacklist_id integer NOT NULL,
    entry_type character varying(20) NOT NULL,
    account_number character varying(20),
    cheque_number bigint,
    national_id character varying(50),
    reason character varying(30),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.blacklist OWNER TO chequemate_user;

--
-- Name: blacklist_blacklist_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.blacklist_blacklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blacklist_blacklist_id_seq OWNER TO chequemate_user;

--
-- Name: blacklist_blacklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.blacklist_blacklist_id_seq OWNED BY public.blacklist.blacklist_id;


--
-- Name: cheque_books; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.cheque_books (
    cheque_book_id integer NOT NULL,
    account_id integer NOT NULL,
    serial_start bigint NOT NULL,
    serial_end bigint NOT NULL,
    issued_date date DEFAULT CURRENT_DATE,
    status character varying(10) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cheque_books OWNER TO chequemate_user;

--
-- Name: cheque_books_cheque_book_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.cheque_books_cheque_book_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cheque_books_cheque_book_id_seq OWNER TO chequemate_user;

--
-- Name: cheque_books_cheque_book_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.cheque_books_cheque_book_id_seq OWNED BY public.cheque_books.cheque_book_id;


--
-- Name: cheque_bounces; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.cheque_bounces (
    bounce_id integer NOT NULL,
    cheque_id integer NOT NULL,
    reason_code character varying(20) NOT NULL,
    reason_text text,
    bounced_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cheque_bounces OWNER TO chequemate_user;

--
-- Name: cheque_bounces_bounce_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.cheque_bounces_bounce_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cheque_bounces_bounce_id_seq OWNER TO chequemate_user;

--
-- Name: cheque_bounces_bounce_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.cheque_bounces_bounce_id_seq OWNED BY public.cheque_bounces.bounce_id;


--
-- Name: cheque_leaves; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.cheque_leaves (
    leaf_id integer NOT NULL,
    cheque_book_id integer NOT NULL,
    cheque_number bigint NOT NULL,
    status character varying(10) DEFAULT 'unused'::character varying,
    stop_payment boolean DEFAULT false,
    used_at timestamp with time zone
);


ALTER TABLE public.cheque_leaves OWNER TO chequemate_user;

--
-- Name: cheque_leaves_leaf_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.cheque_leaves_leaf_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cheque_leaves_leaf_id_seq OWNER TO chequemate_user;

--
-- Name: cheque_leaves_leaf_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.cheque_leaves_leaf_id_seq OWNED BY public.cheque_leaves.leaf_id;


--
-- Name: cheques; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.cheques (
    cheque_id integer NOT NULL,
    cheque_number bigint NOT NULL,
    leaf_id integer,
    drawer_account_id integer NOT NULL,
    drawer_bank_id integer NOT NULL,
    depositor_account_id integer,
    presenting_bank_id integer,
    payee_name character varying(100) NOT NULL,
    amount numeric(18,2) NOT NULL,
    amount_in_words character varying(200),
    issue_date date NOT NULL,
    micr_code character varying(50),
    cheque_image_path character varying(255),
    signature_image_path character varying(255),
    status character varying(15) DEFAULT 'received'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cheques OWNER TO chequemate_user;

--
-- Name: cheques_cheque_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.cheques_cheque_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cheques_cheque_id_seq OWNER TO chequemate_user;

--
-- Name: cheques_cheque_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.cheques_cheque_id_seq OWNED BY public.cheques.cheque_id;


--
-- Name: customer_profiles; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.customer_profiles (
    profile_id integer NOT NULL,
    account_id integer NOT NULL,
    national_id character varying(50),
    phone character varying(20),
    kyc_status character varying(15) DEFAULT 'pending'::character varying,
    kyc_verified_at timestamp with time zone,
    avg_transaction_amt numeric(18,2) DEFAULT 0,
    max_transaction_amt numeric(18,2) DEFAULT 0,
    min_transaction_amt numeric(18,2) DEFAULT 0,
    stddev_transaction_amt numeric(18,2) DEFAULT 0,
    total_transaction_count integer DEFAULT 0,
    monthly_avg_count numeric(5,2) DEFAULT 0,
    total_cheques_issued integer DEFAULT 0,
    bounced_cheques_count integer DEFAULT 0,
    bounce_rate numeric(5,2) DEFAULT 0,
    cancelled_cheques_count integer DEFAULT 0,
    usual_days_of_week integer[] DEFAULT '{}'::integer[],
    usual_hours integer[] DEFAULT '{}'::integer[],
    avg_days_between_txn numeric(5,2) DEFAULT 0,
    last_activity_at timestamp with time zone,
    days_since_last_activity integer DEFAULT 0,
    unique_payee_count integer DEFAULT 0,
    regular_payees text[] DEFAULT '{}'::text[],
    new_payee_rate numeric(5,2) DEFAULT 0,
    risk_category character varying(10) DEFAULT 'medium'::character varying,
    risk_score numeric(5,2) DEFAULT 50,
    behavior_vector text,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.customer_profiles OWNER TO chequemate_user;

--
-- Name: customer_profiles_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.customer_profiles_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_profiles_profile_id_seq OWNER TO chequemate_user;

--
-- Name: customer_profiles_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.customer_profiles_profile_id_seq OWNED BY public.customer_profiles.profile_id;


--
-- Name: deep_verifications; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.deep_verifications (
    verification_id integer NOT NULL,
    cheque_id integer NOT NULL,
    account_active boolean,
    sufficient_funds boolean,
    cheque_leaf_valid boolean,
    matched_signature_id integer,
    signature_score numeric(5,2),
    signature_match character varying(15),
    behavior_score numeric(5,2),
    amount_deviation numeric(5,2),
    is_unusual_amount boolean,
    is_new_payee boolean,
    is_unusual_day boolean,
    is_unusual_time boolean,
    is_high_velocity boolean,
    is_dormant_account boolean,
    velocity_24h integer,
    behavior_flags text[],
    fraud_risk_score numeric(5,2),
    risk_level character varying(10),
    ai_decision character varying(20),
    ai_confidence numeric(5,2),
    ai_reasoning text,
    final_decision character varying(15),
    decision_by character varying(15),
    decision_notes text,
    verified_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.deep_verifications OWNER TO chequemate_user;

--
-- Name: deep_verifications_verification_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.deep_verifications_verification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deep_verifications_verification_id_seq OWNER TO chequemate_user;

--
-- Name: deep_verifications_verification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.deep_verifications_verification_id_seq OWNED BY public.deep_verifications.verification_id;


--
-- Name: fraud_flags; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.fraud_flags (
    flag_id integer NOT NULL,
    cheque_id integer NOT NULL,
    reason text NOT NULL,
    priority character varying(10) DEFAULT 'medium'::character varying,
    status character varying(15) DEFAULT 'pending'::character varying,
    review_notes text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.fraud_flags OWNER TO chequemate_user;

--
-- Name: fraud_flags_flag_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.fraud_flags_flag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fraud_flags_flag_id_seq OWNER TO chequemate_user;

--
-- Name: fraud_flags_flag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.fraud_flags_flag_id_seq OWNED BY public.fraud_flags.flag_id;


--
-- Name: initial_validations; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.initial_validations (
    validation_id integer NOT NULL,
    cheque_id integer NOT NULL,
    all_fields_present boolean,
    date_valid boolean,
    micr_readable boolean,
    ocr_amount numeric(18,2),
    ocr_confidence numeric(5,2),
    amount_match boolean,
    validation_status character varying(15) NOT NULL,
    failure_reason text,
    validated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.initial_validations OWNER TO chequemate_user;

--
-- Name: initial_validations_validation_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.initial_validations_validation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.initial_validations_validation_id_seq OWNER TO chequemate_user;

--
-- Name: initial_validations_validation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.initial_validations_validation_id_seq OWNED BY public.initial_validations.validation_id;


--
-- Name: kyc_documents; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.kyc_documents (
    document_id integer NOT NULL,
    account_id integer NOT NULL,
    doc_type character varying(30) NOT NULL,
    doc_number character varying(50),
    image_path character varying(255),
    ocr_data jsonb,
    is_verified boolean DEFAULT false,
    uploaded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.kyc_documents OWNER TO chequemate_user;

--
-- Name: kyc_documents_document_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.kyc_documents_document_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kyc_documents_document_id_seq OWNER TO chequemate_user;

--
-- Name: kyc_documents_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.kyc_documents_document_id_seq OWNED BY public.kyc_documents.document_id;


--
-- Name: settlements; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.settlements (
    settlement_id integer NOT NULL,
    cheque_id integer NOT NULL,
    from_account_id integer NOT NULL,
    debit_amount numeric(18,2) NOT NULL,
    debited_at timestamp with time zone,
    to_account_id integer NOT NULL,
    credit_amount numeric(18,2) NOT NULL,
    credited_at timestamp with time zone,
    status character varying(15) DEFAULT 'pending'::character varying,
    completed_at timestamp with time zone
);


ALTER TABLE public.settlements OWNER TO chequemate_user;

--
-- Name: settlements_settlement_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.settlements_settlement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settlements_settlement_id_seq OWNER TO chequemate_user;

--
-- Name: settlements_settlement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.settlements_settlement_id_seq OWNED BY public.settlements.settlement_id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: chequemate_user
--

CREATE TABLE public.transactions (
    transaction_id integer NOT NULL,
    settlement_id integer,
    cheque_id integer,
    account_id integer NOT NULL,
    txn_type character varying(10) NOT NULL,
    amount numeric(18,2) NOT NULL,
    balance_after numeric(18,2),
    created_at timestamp with time zone DEFAULT now(),
    receiver_name character varying(100),
    receiver_account character varying(20),
    receiver_label character varying(15) DEFAULT 'unique'::character varying,
    txn_date date,
    txn_time time without time zone,
    branch_code character varying(20),
    branch_name character varying(100),
    txn_number integer
);


ALTER TABLE public.transactions OWNER TO chequemate_user;

--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: chequemate_user
--

CREATE SEQUENCE public.transactions_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_transaction_id_seq OWNER TO chequemate_user;

--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: chequemate_user
--

ALTER SEQUENCE public.transactions_transaction_id_seq OWNED BY public.transactions.transaction_id;


--
-- Name: v_review_queue; Type: VIEW; Schema: public; Owner: chequemate_user
--

CREATE VIEW public.v_review_queue AS
 SELECT f.flag_id,
    f.priority,
    f.reason,
    f.status,
    f.created_at,
    c.cheque_id,
    c.cheque_number,
    c.amount,
    c.payee_name,
    a.account_number,
    a.holder_name,
    d.fraud_risk_score,
    d.risk_level,
    d.ai_decision
   FROM (((public.fraud_flags f
     JOIN public.cheques c ON ((f.cheque_id = c.cheque_id)))
     JOIN public.accounts a ON ((c.drawer_account_id = a.account_id)))
     LEFT JOIN public.deep_verifications d ON ((c.cheque_id = d.cheque_id)))
  WHERE ((f.status)::text = 'pending'::text)
  ORDER BY
        CASE f.priority
            WHEN 'urgent'::text THEN 1
            WHEN 'high'::text THEN 2
            WHEN 'medium'::text THEN 3
            ELSE 4
        END;


ALTER VIEW public.v_review_queue OWNER TO chequemate_user;

--
-- Name: v_today_stats; Type: VIEW; Schema: public; Owner: chequemate_user
--

CREATE VIEW public.v_today_stats AS
 SELECT count(*) AS total,
    count(*) FILTER (WHERE ((status)::text = 'received'::text)) AS received,
    count(*) FILTER (WHERE ((status)::text = 'approved'::text)) AS approved,
    count(*) FILTER (WHERE ((status)::text = 'rejected'::text)) AS rejected,
    count(*) FILTER (WHERE ((status)::text = 'flagged'::text)) AS flagged,
    sum(amount) AS total_amount
   FROM public.cheques
  WHERE ((created_at)::date = CURRENT_DATE);


ALTER VIEW public.v_today_stats OWNER TO chequemate_user;

--
-- Name: account_signatures signature_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.account_signatures ALTER COLUMN signature_id SET DEFAULT nextval('public.account_signatures_signature_id_seq'::regclass);


--
-- Name: accounts account_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.accounts ALTER COLUMN account_id SET DEFAULT nextval('public.accounts_account_id_seq'::regclass);


--
-- Name: banks bank_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.banks ALTER COLUMN bank_id SET DEFAULT nextval('public.banks_bank_id_seq'::regclass);


--
-- Name: bb_clearings clearing_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.bb_clearings ALTER COLUMN clearing_id SET DEFAULT nextval('public.bb_clearings_clearing_id_seq'::regclass);


--
-- Name: blacklist blacklist_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.blacklist ALTER COLUMN blacklist_id SET DEFAULT nextval('public.blacklist_blacklist_id_seq'::regclass);


--
-- Name: cheque_books cheque_book_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheque_books ALTER COLUMN cheque_book_id SET DEFAULT nextval('public.cheque_books_cheque_book_id_seq'::regclass);


--
-- Name: cheque_bounces bounce_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheque_bounces ALTER COLUMN bounce_id SET DEFAULT nextval('public.cheque_bounces_bounce_id_seq'::regclass);


--
-- Name: cheque_leaves leaf_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheque_leaves ALTER COLUMN leaf_id SET DEFAULT nextval('public.cheque_leaves_leaf_id_seq'::regclass);


--
-- Name: cheques cheque_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheques ALTER COLUMN cheque_id SET DEFAULT nextval('public.cheques_cheque_id_seq'::regclass);


--
-- Name: customer_profiles profile_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.customer_profiles ALTER COLUMN profile_id SET DEFAULT nextval('public.customer_profiles_profile_id_seq'::regclass);


--
-- Name: deep_verifications verification_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.deep_verifications ALTER COLUMN verification_id SET DEFAULT nextval('public.deep_verifications_verification_id_seq'::regclass);


--
-- Name: fraud_flags flag_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.fraud_flags ALTER COLUMN flag_id SET DEFAULT nextval('public.fraud_flags_flag_id_seq'::regclass);


--
-- Name: initial_validations validation_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.initial_validations ALTER COLUMN validation_id SET DEFAULT nextval('public.initial_validations_validation_id_seq'::regclass);


--
-- Name: kyc_documents document_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.kyc_documents ALTER COLUMN document_id SET DEFAULT nextval('public.kyc_documents_document_id_seq'::regclass);


--
-- Name: settlements settlement_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.settlements ALTER COLUMN settlement_id SET DEFAULT nextval('public.settlements_settlement_id_seq'::regclass);


--
-- Name: transactions transaction_id; Type: DEFAULT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.transactions ALTER COLUMN transaction_id SET DEFAULT nextval('public.transactions_transaction_id_seq'::regclass);


--
-- Data for Name: account_signatures; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.account_signatures (signature_id, account_id, image_path, feature_vector, is_primary, created_at) FROM stdin;
1	1	/signatures/alice_rahman.png	\N	t	2024-06-15 10:15:00+06
2	2	/signatures/bob_chowdhury_1.png	\N	t	2024-03-20 11:45:00+06
3	2	/signatures/bob_chowdhury_2.png	\N	f	2024-03-20 11:50:00+06
4	3	/signatures/carol_ahmed.png	\N	t	2023-12-10 09:15:00+06
5	4	/signatures/david_khan.png	\N	t	2024-08-05 14:15:00+06
6	5	/signatures/eve_hossain_1.png	\N	t	2023-09-25 11:15:00+06
7	5	/signatures/eve_hossain_2.png	\N	f	2023-09-25 11:20:00+06
8	7	/signatures/mansur.png	\N	t	2025-01-15 10:45:00+06
9	8	/signatures/swastika.png	\N	t	2025-06-20 10:00:00+06
10	7	/signatures/mansur.png	\N	t	2025-12-03 00:50:09.683664+06
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.accounts (account_id, bank_id, account_number, holder_name, account_type, balance, status, created_at) FROM stdin;
1	1	1001-00001	Alice Rahman	savings	75000.00	active	2025-12-02 21:40:00.161942+06
2	1	1001-00002	Bob Chowdhury	savings	150000.00	active	2025-12-02 21:40:00.161942+06
3	2	2001-00001	Carol Ahmed	savings	500000.00	active	2025-12-02 21:40:00.161942+06
4	2	2001-00002	David Khan	savings	250000.00	active	2025-12-02 21:40:00.161942+06
5	2	2001-00003	Eve Hossain	savings	1000000.00	active	2025-12-02 21:40:00.161942+06
8	5	4404001000379	SWASTIKA PANDIT	savings	50000.00	active	2025-12-02 21:40:00.161942+06
7	4	20503040200090711	A. H. M. MANSUR	current	500000.00	active	2025-12-02 21:40:00.161942+06
12	4	20503040200090712	KARIM AHMED	savings	250000.00	active	2025-12-03 00:50:09.67972+06
13	5	30100200300400	MOHAMMAD SHAHIDULLAH	savings	100000.00	active	2025-12-03 00:50:09.68146+06
14	5	30100200300401	FATIMA BEGUM	current	350000.00	active	2025-12-03 00:50:09.682684+06
\.


--
-- Data for Name: banks; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.banks (bank_id, bank_code, bank_name, bank_type, routing_number) FROM stdin;
1	BANK_A	Alpha Bank Ltd	commercial	010123456
2	BANK_B	Beta Bank Ltd	commercial	020234567
3	BB	Bangladesh Bank	central	000000000
4	IBBL	Islami Bank Bangladesh Limited	commercial	125155801
5	SONALI	Sonali Bank Limited	government	200260005
\.


--
-- Data for Name: bb_clearings; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.bb_clearings (clearing_id, cheque_id, clearing_reference, from_bank_id, to_bank_id, received_at, forwarded_at, blacklist_hit, blacklist_match_id, duplicate_hit, duplicate_of_cheque, stop_payment_hit, status, response_status, response_at) FROM stdin;
19	30	CLR-1764712717317-30	5	4	2025-12-03 03:58:37.317295+06	2025-12-03 03:58:39.330947+06	f	\N	f	\N	f	responded	flagged	2025-12-03 03:59:02.243254+06
\.


--
-- Data for Name: blacklist; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.blacklist (blacklist_id, entry_type, account_number, cheque_number, national_id, reason, description, is_active, created_at) FROM stdin;
1	account	9999-FRAUD-01	\N	\N	fraud	Account involved in cheque fraud ring - reported by multiple banks	t	2025-12-02 21:40:00.236284+06
2	account	9999-FRAUD-02	\N	\N	fraud	Repeated bounced cheques with forged signatures	t	2025-12-02 21:40:00.236284+06
3	cheque	\N	888001	\N	stolen	Cheque book reported stolen from Alpha Bank branch robbery	t	2025-12-02 21:40:00.236284+06
4	cheque	\N	888002	\N	stolen	Part of stolen cheque book - serial 888001-888050	t	2025-12-02 21:40:00.236284+06
5	cheque	\N	888003	\N	stolen	Part of stolen cheque book - serial 888001-888050	t	2025-12-02 21:40:00.236284+06
6	cheque	2001-00002	400003	\N	lost	Cheque lost by account holder, stop payment requested	t	2025-12-02 21:40:00.236284+06
7	cheque	1001-00002	200055	\N	stop_payment	Stop payment issued - dispute with payee	t	2025-12-02 21:40:00.236284+06
8	person	\N	\N	1975999888777	fraud	Known fraudster - multiple cases of cheque forgery across banks	t	2025-12-02 21:40:00.236284+06
9	person	\N	\N	1980111222333	fraud	Identity theft suspect - uses fake documents	t	2025-12-02 21:40:00.236284+06
10	account	8888-OLD-01	\N	\N	fraud	Historical fraud case - resolved and account closed	f	2025-12-02 21:40:00.236284+06
\.


--
-- Data for Name: cheque_books; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.cheque_books (cheque_book_id, account_id, serial_start, serial_end, issued_date, status, created_at) FROM stdin;
1	1	100001	100025	2024-06-20	active	2025-12-02 21:40:00.198052+06
2	2	200001	200050	2024-03-25	exhausted	2025-12-02 21:40:00.198052+06
3	2	200051	200100	2024-09-15	active	2025-12-02 21:40:00.198052+06
4	3	300001	300050	2024-01-10	active	2025-12-02 21:40:00.198052+06
5	4	400001	400025	2024-08-10	active	2025-12-02 21:40:00.198052+06
6	5	500001	500050	2023-10-01	exhausted	2025-12-02 21:40:00.198052+06
7	5	500051	500100	2024-06-01	active	2025-12-02 21:40:00.198052+06
8	7	600001	600025	2025-01-20	active	2025-12-02 21:40:00.198052+06
9	8	700001	700025	2025-06-25	active	2025-12-02 21:40:00.198052+06
11	7	3566700	3566799	2023-01-01	active	2025-12-02 22:47:59.25659+06
\.


--
-- Data for Name: cheque_bounces; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.cheque_bounces (bounce_id, cheque_id, reason_code, reason_text, bounced_at) FROM stdin;
1	4	INSUF_FUNDS	Account balance (250,000) insufficient for cheque amount (300,000). Shortfall: 50,000 BDT.	2024-08-20 18:45:00+06
2	10	SIG_MISMATCH	Signature verification failed. AI confidence: 35.2%. Manual review confirmed forgery attempt.	2024-09-10 19:00:00+06
\.


--
-- Data for Name: cheque_leaves; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.cheque_leaves (leaf_id, cheque_book_id, cheque_number, status, stop_payment, used_at) FROM stdin;
1	1	100001	used	f	2024-07-15 10:00:00+06
2	1	100002	used	f	2024-08-20 11:30:00+06
3	1	100003	used	f	2024-09-10 14:00:00+06
4	1	100004	cancelled	f	\N
5	1	100005	unused	f	\N
6	1	100006	unused	f	\N
7	1	100007	unused	f	\N
8	1	100008	unused	f	\N
9	1	100009	unused	f	\N
10	1	100010	unused	f	\N
11	3	200051	used	f	2024-09-20 09:00:00+06
12	3	200052	used	f	2024-10-05 10:30:00+06
13	3	200053	used	f	2024-10-15 11:00:00+06
14	3	200054	used	f	2024-11-01 14:00:00+06
15	3	200055	stopped	t	\N
16	3	200056	unused	f	\N
17	3	200057	unused	f	\N
18	3	200058	unused	f	\N
19	3	200059	unused	f	\N
20	3	200060	unused	f	\N
21	4	300001	used	f	2024-02-10 10:00:00+06
22	4	300002	used	f	2024-03-15 11:00:00+06
23	4	300003	used	f	2024-04-20 09:30:00+06
24	4	300004	used	f	2024-05-25 14:00:00+06
25	4	300005	used	f	2024-06-30 10:00:00+06
26	4	300006	unused	f	\N
27	4	300007	unused	f	\N
28	4	300008	unused	f	\N
29	4	300009	unused	f	\N
30	4	300010	unused	f	\N
31	5	400001	used	f	2024-08-20 15:00:00+06
32	5	400002	used	f	2024-09-10 16:00:00+06
33	5	400003	lost	f	\N
34	5	400004	unused	f	\N
35	5	400005	unused	f	\N
36	5	400006	unused	f	\N
37	5	400007	unused	f	\N
38	5	400008	unused	f	\N
39	5	400009	unused	f	\N
40	5	400010	unused	f	\N
41	7	500051	used	f	2024-06-15 10:00:00+06
42	7	500052	used	f	2024-07-20 11:00:00+06
43	7	500053	used	f	2024-08-25 09:00:00+06
44	7	500054	used	f	2024-09-30 14:00:00+06
45	7	500055	used	f	2024-10-15 10:30:00+06
46	7	500056	unused	f	\N
47	7	500057	unused	f	\N
48	7	500058	unused	f	\N
49	7	500059	unused	f	\N
50	7	500060	unused	f	\N
51	8	600001	used	f	2025-02-10 10:00:00+06
52	8	600002	used	f	2025-03-15 11:30:00+06
53	8	600003	unused	f	\N
54	8	600004	unused	f	\N
55	8	600005	unused	f	\N
56	8	600006	unused	f	\N
57	8	600007	unused	f	\N
58	8	600008	unused	f	\N
59	8	600009	unused	f	\N
60	8	600010	unused	f	\N
61	9	700001	used	f	2025-07-10 10:00:00+06
62	9	700002	used	f	2025-08-15 11:00:00+06
63	9	700003	unused	f	\N
64	9	700004	unused	f	\N
65	9	700005	unused	f	\N
66	9	700006	unused	f	\N
67	9	700007	unused	f	\N
68	9	700008	unused	f	\N
69	9	700009	unused	f	\N
70	9	700010	unused	f	\N
73	11	3566750	unused	f	\N
74	11	3566751	unused	f	\N
75	11	3566752	unused	f	\N
72	11	3566753	unused	f	\N
77	11	3566754	unused	f	\N
78	11	3566755	unused	f	\N
79	11	3566756	unused	f	\N
80	11	3566757	unused	f	\N
81	11	3566758	unused	f	\N
82	11	3566759	unused	f	\N
83	11	3566760	unused	f	\N
\.


--
-- Data for Name: cheques; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.cheques (cheque_id, cheque_number, leaf_id, drawer_account_id, drawer_bank_id, depositor_account_id, presenting_bank_id, payee_name, amount, amount_in_words, issue_date, micr_code, cheque_image_path, signature_image_path, status, created_at) FROM stdin;
1	100001	1	1	1	3	2	Carol Ahmed	25000.00	Twenty Five Thousand Taka Only	2024-07-15	100001:010123:100100001	/cheques/cheque_100001.jpg	/cheques/sig_100001.jpg	settled	2025-12-02 21:40:00.250162+06
2	200051	11	2	1	4	2	Supplier ABC Ltd	45000.00	Forty Five Thousand Taka Only	2024-09-20	200051:010123:100100002	/cheques/cheque_200051.jpg	/cheques/sig_200051.jpg	settled	2025-12-02 21:40:00.250162+06
3	300001	21	3	2	5	2	Eve Hossain	200000.00	Two Lakh Taka Only	2024-02-10	300001:020234:200100001	/cheques/cheque_300001.jpg	/cheques/sig_300001.jpg	settled	2025-12-02 21:40:00.250162+06
4	400001	31	4	2	2	1	Bob Chowdhury	300000.00	Three Lakh Taka Only	2024-08-20	400001:020234:200100002	/cheques/cheque_400001.jpg	/cheques/sig_400001.jpg	bounced	2025-12-02 21:40:00.250162+06
5	500051	41	5	2	1	1	Alice Rahman	150000.00	One Lakh Fifty Thousand Taka Only	2024-06-15	500051:020234:200100003	/cheques/cheque_500051.jpg	/cheques/sig_500051.jpg	settled	2025-12-02 21:40:00.250162+06
7	700001	61	8	5	1	1	Alice Rahman	15000.00	Fifteen Thousand Taka Only	2025-07-10	700001:200270:4404001000379	/cheques/cheque_700001.jpg	/cheques/sig_700001.jpg	validated	2025-12-02 21:40:00.250162+06
8	200052	12	2	1	5	2	Eve Hossain	120000.00	One Lakh Twenty Thousand Taka Only	2024-10-05	200052:010123:100100002	/cheques/cheque_200052.jpg	/cheques/sig_200052.jpg	flagged	2025-12-02 21:40:00.250162+06
10	400002	32	4	2	3	2	Carol Ahmed	80000.00	Eighty Thousand Taka Only	2024-09-10	400002:020234:200100002	/cheques/cheque_400002.jpg	/cheques/sig_400002_fake.jpg	rejected	2025-12-02 21:40:00.250162+06
30	3566753	72	7	4	13	5	Mohammad Shahidullah	105000.00	One lac five Thousand taka only	2025-12-02	3566753 125155801 3040200090711 10	/home/torr20/Documents/chequemate-ai/server/temp/upload_1764712662680.png	/home/torr20/Documents/chequemate-ai/server/temp/signature_1764712662680.png	flagged	2025-12-03 03:57:55.386675+06
9	300006	26	3	2	4	2	David Khan	50000.00	Fifty Thousand Taka Only	2025-12-01	300006:020234:200100001	/cheques/cheque_300006.jpg	/cheques/sig_300006.jpg	validated	2025-12-02 21:40:00.250162+06
\.


--
-- Data for Name: customer_profiles; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.customer_profiles (profile_id, account_id, national_id, phone, kyc_status, kyc_verified_at, avg_transaction_amt, max_transaction_amt, min_transaction_amt, stddev_transaction_amt, total_transaction_count, monthly_avg_count, total_cheques_issued, bounced_cheques_count, bounce_rate, cancelled_cheques_count, usual_days_of_week, usual_hours, avg_days_between_txn, last_activity_at, days_since_last_activity, unique_payee_count, regular_payees, new_payee_rate, risk_category, risk_score, behavior_vector, updated_at) FROM stdin;
1	1	1990123456789	+8801711111111	verified	2024-06-15 10:00:00+06	15000.00	50000.00	5000.00	8000.00	45	3.75	40	0	0.00	2	{1,2,3,4,5}	{10,11,14,15}	8.50	2025-11-28 14:30:00+06	4	8	{"Dhaka Electric",Grameenphone,"Family Transfer"}	10.00	low	15.00	\N	2025-12-02 21:45:06.77987+06
2	2	1985234567890	+8801722222222	verified	2024-03-20 11:30:00+06	35000.00	120000.00	10000.00	25000.00	120	10.00	110	3	2.73	5	{0,1,2,3,4}	{9,10,11,12,14,15,16}	3.00	2025-12-01 16:45:00+06	1	25	{"Supplier ABC","Rent Office","Staff Salary","Utility Bills"}	15.00	medium	45.00	\N	2025-12-02 21:45:06.77987+06
3	3	1978345678901	+8801733333333	verified	2023-12-10 09:00:00+06	85000.00	300000.00	20000.00	45000.00	200	16.67	180	1	0.56	3	{1,2,3,4,5}	{10,11,12,14,15}	2.00	2025-12-02 10:00:00+06	0	40	{"Investment Fund","Property Payment","Insurance Premium","Charity Trust"}	8.00	low	20.00	\N	2025-12-02 21:45:06.77987+06
4	4	1992456789012	+8801744444444	verified	2024-08-05 14:00:00+06	28000.00	80000.00	5000.00	20000.00	65	5.42	55	2	3.64	4	{0,1,4,5,6}	{9,10,17,18,19}	6.00	2025-11-25 18:20:00+06	7	18	{"Online Shopping","Restaurant Bills","Travel Agency"}	25.00	medium	52.00	\N	2025-12-02 21:45:06.77987+06
5	5	1980567890123	+8801755555555	verified	2023-09-25 11:00:00+06	150000.00	500000.00	50000.00	80000.00	95	7.92	85	0	0.00	1	{1,2,3,4}	{10,11,12,15,16}	4.00	2025-11-30 12:00:00+06	2	15	{"Company Account","Tax Payment","Investment Portfolio","Premium Services"}	5.00	low	12.00	\N	2025-12-02 21:45:06.77987+06
7	7	1988678901234	+8801766666666	verified	2025-01-15 10:30:00+06	42000.00	100000.00	15000.00	22000.00	35	3.50	30	1	3.33	2	{0,1,2,3,4}	{9,10,11,14,15,16}	10.00	2025-11-20 11:15:00+06	12	12	{"Supplier Payment","Office Rent",Utility}	20.00	medium	48.00	\N	2025-12-02 21:45:06.77987+06
8	8	1995789012345	+8801777777777	verified	2025-06-20 09:45:00+06	12000.00	35000.00	3000.00	6000.00	25	4.17	22	0	0.00	1	{1,2,3,4,5}	{10,11,12,14,15}	7.00	2025-12-01 10:30:00+06	1	6	{"Family Support","Utility Bills","Education Fee"}	12.00	low	18.00	\N	2025-12-02 21:45:06.77987+06
\.


--
-- Data for Name: deep_verifications; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.deep_verifications (verification_id, cheque_id, account_active, sufficient_funds, cheque_leaf_valid, matched_signature_id, signature_score, signature_match, behavior_score, amount_deviation, is_unusual_amount, is_new_payee, is_unusual_day, is_unusual_time, is_high_velocity, is_dormant_account, velocity_24h, behavior_flags, fraud_risk_score, risk_level, ai_decision, ai_confidence, ai_reasoning, final_decision, decision_by, decision_notes, verified_at) FROM stdin;
29	30	\N	\N	\N	\N	19.75	no_match	\N	\N	\N	\N	\N	\N	\N	\N	\N	{signature-verify}	15.00	low	flag_for_review	19.75	Account Verification: Account verified and active; Cheque Leaf Verification: Cheque leaf is valid and unused; Funds Availability: Sufficient funds available; Date Validity Check: Date is within valid range; Signature Verification (AI): Signature MISMATCH (19.8% confidence) - POTENTIAL FRAUD; AI-Generated Detection (SynthID): No AI-generated artifacts detected; Fraud Risk Analysis: Transaction within normal patterns	\N	\N	\N	2025-12-03 03:57:55.481409+06
\.


--
-- Data for Name: fraud_flags; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.fraud_flags (flag_id, cheque_id, reason, priority, status, review_notes, reviewed_at, created_at) FROM stdin;
5	30	Requires manual review	medium	pending	\N	\N	2025-12-03 03:59:02.24543+06
\.


--
-- Data for Name: initial_validations; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.initial_validations (validation_id, cheque_id, all_fields_present, date_valid, micr_readable, ocr_amount, ocr_confidence, amount_match, validation_status, failure_reason, validated_at) FROM stdin;
47	30	t	t	t	105000.00	\N	f	passed	\N	2025-12-03 03:57:55.388525+06
\.


--
-- Data for Name: kyc_documents; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.kyc_documents (document_id, account_id, doc_type, doc_number, image_path, ocr_data, is_verified, uploaded_at) FROM stdin;
1	1	nid	1990123456789	/kyc/alice_nid.jpg	{"dob": "1990-05-15", "name": "Alice Rahman", "address": "House 12, Road 5, Dhanmondi, Dhaka"}	t	2024-06-15 10:00:00+06
2	1	utility_bill	DESCO-2024-001234	/kyc/alice_utility.jpg	{"address": "House 12, Road 5, Dhanmondi", "provider": "DESCO", "bill_month": "May 2024"}	t	2024-06-15 10:05:00+06
3	2	nid	1985234567890	/kyc/bob_nid.jpg	{"dob": "1985-08-22", "name": "Bob Chowdhury", "address": "Flat 4B, Green Tower, Gulshan, Dhaka"}	t	2024-03-20 11:30:00+06
4	2	passport	AB1234567	/kyc/bob_passport.jpg	{"name": "Bob Chowdhury", "expiry": "2028-03-15", "passport_no": "AB1234567"}	t	2024-03-20 11:35:00+06
5	3	nid	1978345678901	/kyc/carol_nid.jpg	{"dob": "1978-12-03", "name": "Carol Ahmed", "address": "Villa 8, Baridhara, Dhaka"}	t	2023-12-10 09:00:00+06
6	4	nid	1992456789012	/kyc/david_nid.jpg	{"dob": "1992-03-18", "name": "David Khan", "address": "Apt 302, City Center, Uttara, Dhaka"}	t	2024-08-05 14:00:00+06
7	5	nid	1980567890123	/kyc/eve_nid.jpg	{"dob": "1980-07-25", "name": "Eve Hossain", "address": "Penthouse, Platinum Towers, Banani, Dhaka"}	t	2023-09-25 11:00:00+06
8	5	passport	CD9876543	/kyc/eve_passport.jpg	{"name": "Eve Hossain", "expiry": "2030-09-20", "passport_no": "CD9876543"}	t	2023-09-25 11:10:00+06
9	7	nid	1988678901234	/kyc/mansur_nid.jpg	{"dob": "1988-11-10", "name": "A. H. M. MANSUR", "address": "Shop 45, New Market, Dhaka"}	t	2025-01-15 10:30:00+06
10	7	trade_license	TL-DHK-2024-5678	/kyc/mansur_trade.jpg	{"license_no": "TL-DHK-2024-5678", "valid_until": "2025-12-31", "business_name": "Mansur Trading"}	t	2025-01-15 10:40:00+06
11	8	nid	1995789012345	/kyc/swastika_nid.jpg	{"dob": "1995-02-28", "name": "SWASTIKA PANDIT", "address": "House 23, College Road, Rajshahi"}	t	2025-06-20 09:45:00+06
\.


--
-- Data for Name: settlements; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.settlements (settlement_id, cheque_id, from_account_id, debit_amount, debited_at, to_account_id, credit_amount, credited_at, status, completed_at) FROM stdin;
1	1	1	25000.00	2024-07-15 15:00:00+06	3	25000.00	2024-07-15 15:00:00+06	completed	2024-07-15 15:00:00+06
2	2	2	45000.00	2024-09-20 14:00:00+06	4	45000.00	2024-09-20 14:00:00+06	completed	2024-09-20 14:00:00+06
3	3	3	200000.00	2024-02-10 13:00:00+06	5	200000.00	2024-02-10 13:00:00+06	completed	2024-02-10 13:00:00+06
4	4	4	300000.00	\N	2	300000.00	\N	failed	\N
5	5	5	150000.00	2024-06-15 15:00:00+06	1	150000.00	2024-06-15 15:00:00+06	completed	2024-06-15 15:00:00+06
7	7	8	15000.00	\N	1	15000.00	\N	pending	\N
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: chequemate_user
--

COPY public.transactions (transaction_id, settlement_id, cheque_id, account_id, txn_type, amount, balance_after, created_at, receiver_name, receiver_account, receiver_label, txn_date, txn_time, branch_code, branch_name, txn_number) FROM stdin;
1	\N	\N	1	debit	5000.00	70000.00	2024-06-01 10:30:00+06	Dhaka Electric Supply	9999-DESCO-01	regular	2024-06-01	10:30:00	ALPHA-DHNK-01	Alpha Bank Dhanmondi	1
2	\N	\N	1	debit	2500.00	67500.00	2024-06-15 11:00:00+06	Grameenphone Ltd	9999-GP-001	regular	2024-06-15	11:00:00	ALPHA-DHNK-01	Alpha Bank Dhanmondi	2
3	\N	\N	1	debit	15000.00	52500.00	2024-07-01 14:30:00+06	Family Transfer - Rahman	1001-00099	regular	2024-07-01	14:30:00	ALPHA-DHNK-01	Alpha Bank Dhanmondi	3
4	1	1	1	debit	25000.00	50000.00	2024-07-15 15:00:00+06	Carol Ahmed	2001-00001	unique	2024-07-15	15:00:00	ALPHA-DHNK-01	Alpha Bank Dhanmondi	4
5	5	5	1	credit	150000.00	200000.00	2024-06-15 15:00:00+06	Eve Hossain	2001-00003	unique	2024-06-15	15:00:00	ALPHA-DHNK-01	Alpha Bank Dhanmondi	5
6	\N	\N	2	debit	35000.00	115000.00	2024-08-05 09:30:00+06	Supplier ABC Ltd	8888-SUP-001	regular	2024-08-05	09:30:00	ALPHA-GULN-02	Alpha Bank Gulshan	1
7	\N	\N	2	debit	50000.00	100000.00	2024-08-15 10:00:00+06	Office Rent - Landlord	7777-RENT-01	regular	2024-08-15	10:00:00	ALPHA-GULN-02	Alpha Bank Gulshan	2
8	\N	\N	2	debit	25000.00	125000.00	2024-09-01 11:30:00+06	Staff Salary - Karim	1001-00050	regular	2024-09-01	11:30:00	ALPHA-GULN-02	Alpha Bank Gulshan	3
9	2	2	2	debit	45000.00	105000.00	2024-09-20 14:00:00+06	David Khan	2001-00002	unique	2024-09-20	14:00:00	ALPHA-GULN-02	Alpha Bank Gulshan	4
10	\N	\N	2	debit	120000.00	30000.00	2024-10-01 16:45:00+06	New Vendor XYZ	5555-NEW-99	unique	2024-10-01	16:45:00	ALPHA-GULN-02	Alpha Bank Gulshan	5
11	\N	\N	3	debit	100000.00	400000.00	2024-01-10 10:00:00+06	Investment Fund Alpha	6666-INV-01	regular	2024-01-10	10:00:00	BETA-BANG-01	Beta Bank Banani	1
12	3	3	3	debit	200000.00	300000.00	2024-02-10 13:00:00+06	Eve Hossain	2001-00003	unique	2024-02-10	13:00:00	BETA-BANG-01	Beta Bank Banani	2
13	1	1	3	credit	25000.00	525000.00	2024-07-15 15:00:00+06	Alice Rahman	1001-00001	unique	2024-07-15	15:00:00	BETA-BANG-01	Beta Bank Banani	3
14	\N	\N	3	debit	75000.00	450000.00	2024-08-01 11:30:00+06	Property Tax Payment	9999-GOVT-01	regular	2024-08-01	11:30:00	BETA-BANG-01	Beta Bank Banani	4
15	2	2	4	credit	45000.00	295000.00	2024-09-20 14:00:00+06	Bob Chowdhury	1001-00002	unique	2024-09-20	14:00:00	BETA-UTTARA-02	Beta Bank Uttara	1
16	\N	\N	4	debit	80000.00	215000.00	2024-10-05 19:30:00+06	Online Shopping - Daraz	8888-DARAZ-01	regular	2024-10-05	19:30:00	BETA-UTTARA-02	Beta Bank Uttara	2
17	\N	\N	4	debit	15000.00	200000.00	2024-10-20 21:00:00+06	Restaurant - Takeout	7777-REST-01	unique	2024-10-20	21:00:00	BETA-UTTARA-02	Beta Bank Uttara	3
18	3	3	5	credit	200000.00	1200000.00	2024-02-10 13:00:00+06	Carol Ahmed	2001-00001	unique	2024-02-10	13:00:00	BETA-MOTI-03	Beta Bank Motijheel	1
19	5	5	5	debit	150000.00	850000.00	2024-06-15 15:00:00+06	Alice Rahman	1001-00001	unique	2024-06-15	15:00:00	BETA-MOTI-03	Beta Bank Motijheel	2
20	\N	\N	5	debit	500000.00	500000.00	2024-07-01 10:00:00+06	Company Investment Account	9999-CORP-01	regular	2024-07-01	10:00:00	BETA-MOTI-03	Beta Bank Motijheel	3
\.


--
-- Name: account_signatures_signature_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.account_signatures_signature_id_seq', 10, true);


--
-- Name: accounts_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.accounts_account_id_seq', 14, true);


--
-- Name: banks_bank_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.banks_bank_id_seq', 9, true);


--
-- Name: bb_clearings_clearing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.bb_clearings_clearing_id_seq', 19, true);


--
-- Name: blacklist_blacklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.blacklist_blacklist_id_seq', 10, true);


--
-- Name: cheque_books_cheque_book_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.cheque_books_cheque_book_id_seq', 11, true);


--
-- Name: cheque_bounces_bounce_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.cheque_bounces_bounce_id_seq', 2, true);


--
-- Name: cheque_leaves_leaf_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.cheque_leaves_leaf_id_seq', 83, true);


--
-- Name: cheques_cheque_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.cheques_cheque_id_seq', 30, true);


--
-- Name: customer_profiles_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.customer_profiles_profile_id_seq', 8, true);


--
-- Name: deep_verifications_verification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.deep_verifications_verification_id_seq', 30, true);


--
-- Name: fraud_flags_flag_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.fraud_flags_flag_id_seq', 5, true);


--
-- Name: initial_validations_validation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.initial_validations_validation_id_seq', 47, true);


--
-- Name: kyc_documents_document_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.kyc_documents_document_id_seq', 11, true);


--
-- Name: settlements_settlement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.settlements_settlement_id_seq', 7, true);


--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: chequemate_user
--

SELECT pg_catalog.setval('public.transactions_transaction_id_seq', 20, true);


--
-- Name: account_signatures account_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.account_signatures
    ADD CONSTRAINT account_signatures_pkey PRIMARY KEY (signature_id);


--
-- Name: accounts accounts_account_number_key; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_account_number_key UNIQUE (account_number);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (account_id);


--
-- Name: banks banks_bank_code_key; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_bank_code_key UNIQUE (bank_code);


--
-- Name: banks banks_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_pkey PRIMARY KEY (bank_id);


--
-- Name: bb_clearings bb_clearings_clearing_reference_key; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.bb_clearings
    ADD CONSTRAINT bb_clearings_clearing_reference_key UNIQUE (clearing_reference);


--
-- Name: bb_clearings bb_clearings_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.bb_clearings
    ADD CONSTRAINT bb_clearings_pkey PRIMARY KEY (clearing_id);


--
-- Name: blacklist blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.blacklist
    ADD CONSTRAINT blacklist_pkey PRIMARY KEY (blacklist_id);


--
-- Name: cheque_books cheque_books_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheque_books
    ADD CONSTRAINT cheque_books_pkey PRIMARY KEY (cheque_book_id);


--
-- Name: cheque_bounces cheque_bounces_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheque_bounces
    ADD CONSTRAINT cheque_bounces_pkey PRIMARY KEY (bounce_id);


--
-- Name: cheque_leaves cheque_leaves_cheque_book_id_cheque_number_key; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheque_leaves
    ADD CONSTRAINT cheque_leaves_cheque_book_id_cheque_number_key UNIQUE (cheque_book_id, cheque_number);


--
-- Name: cheque_leaves cheque_leaves_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheque_leaves
    ADD CONSTRAINT cheque_leaves_pkey PRIMARY KEY (leaf_id);


--
-- Name: cheques cheques_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_pkey PRIMARY KEY (cheque_id);


--
-- Name: customer_profiles customer_profiles_account_id_key; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_account_id_key UNIQUE (account_id);


--
-- Name: customer_profiles customer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_pkey PRIMARY KEY (profile_id);


--
-- Name: deep_verifications deep_verifications_cheque_id_unique; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.deep_verifications
    ADD CONSTRAINT deep_verifications_cheque_id_unique UNIQUE (cheque_id);


--
-- Name: deep_verifications deep_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.deep_verifications
    ADD CONSTRAINT deep_verifications_pkey PRIMARY KEY (verification_id);


--
-- Name: fraud_flags fraud_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.fraud_flags
    ADD CONSTRAINT fraud_flags_pkey PRIMARY KEY (flag_id);


--
-- Name: initial_validations initial_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.initial_validations
    ADD CONSTRAINT initial_validations_pkey PRIMARY KEY (validation_id);


--
-- Name: kyc_documents kyc_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.kyc_documents
    ADD CONSTRAINT kyc_documents_pkey PRIMARY KEY (document_id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (settlement_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: idx_accounts_bank; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_accounts_bank ON public.accounts USING btree (bank_id);


--
-- Name: idx_bb_clearing_cheque; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_bb_clearing_cheque ON public.bb_clearings USING btree (cheque_id);


--
-- Name: idx_bb_clearing_status; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_bb_clearing_status ON public.bb_clearings USING btree (status);


--
-- Name: idx_blacklist_account; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_blacklist_account ON public.blacklist USING btree (account_number);


--
-- Name: idx_blacklist_cheque; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_blacklist_cheque ON public.blacklist USING btree (cheque_number);


--
-- Name: idx_blacklist_national_id; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_blacklist_national_id ON public.blacklist USING btree (national_id);


--
-- Name: idx_bounces_cheque; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_bounces_cheque ON public.cheque_bounces USING btree (cheque_id);


--
-- Name: idx_chequebooks_account; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_chequebooks_account ON public.cheque_books USING btree (account_id);


--
-- Name: idx_cheques_drawer; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_cheques_drawer ON public.cheques USING btree (drawer_account_id);


--
-- Name: idx_cheques_number; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_cheques_number ON public.cheques USING btree (cheque_number);


--
-- Name: idx_cheques_status; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_cheques_status ON public.cheques USING btree (status);


--
-- Name: idx_deep_ver_cheque; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_deep_ver_cheque ON public.deep_verifications USING btree (cheque_id);


--
-- Name: idx_fraud_flags_cheque; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_fraud_flags_cheque ON public.fraud_flags USING btree (cheque_id);


--
-- Name: idx_fraud_flags_status; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_fraud_flags_status ON public.fraud_flags USING btree (status);


--
-- Name: idx_initial_val_cheque; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_initial_val_cheque ON public.initial_validations USING btree (cheque_id);


--
-- Name: idx_kyc_account; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_kyc_account ON public.kyc_documents USING btree (account_id);


--
-- Name: idx_leaves_cheque_number; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_leaves_cheque_number ON public.cheque_leaves USING btree (cheque_number);


--
-- Name: idx_profiles_national_id; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_profiles_national_id ON public.customer_profiles USING btree (national_id);


--
-- Name: idx_profiles_risk; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_profiles_risk ON public.customer_profiles USING btree (risk_category);


--
-- Name: idx_settlements_cheque; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_settlements_cheque ON public.settlements USING btree (cheque_id);


--
-- Name: idx_signatures_account; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_signatures_account ON public.account_signatures USING btree (account_id);


--
-- Name: idx_transactions_account; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_transactions_account ON public.transactions USING btree (account_id);


--
-- Name: idx_transactions_cheque; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_transactions_cheque ON public.transactions USING btree (cheque_id);


--
-- Name: idx_transactions_date; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_transactions_date ON public.transactions USING btree (txn_date);


--
-- Name: idx_transactions_receiver; Type: INDEX; Schema: public; Owner: chequemate_user
--

CREATE INDEX idx_transactions_receiver ON public.transactions USING btree (receiver_name);


--
-- Name: account_signatures account_signatures_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.account_signatures
    ADD CONSTRAINT account_signatures_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id);


--
-- Name: accounts accounts_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.banks(bank_id);


--
-- Name: bb_clearings bb_clearings_blacklist_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.bb_clearings
    ADD CONSTRAINT bb_clearings_blacklist_match_id_fkey FOREIGN KEY (blacklist_match_id) REFERENCES public.blacklist(blacklist_id);


--
-- Name: bb_clearings bb_clearings_cheque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.bb_clearings
    ADD CONSTRAINT bb_clearings_cheque_id_fkey FOREIGN KEY (cheque_id) REFERENCES public.cheques(cheque_id);


--
-- Name: bb_clearings bb_clearings_duplicate_of_cheque_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.bb_clearings
    ADD CONSTRAINT bb_clearings_duplicate_of_cheque_fkey FOREIGN KEY (duplicate_of_cheque) REFERENCES public.cheques(cheque_id);


--
-- Name: bb_clearings bb_clearings_from_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.bb_clearings
    ADD CONSTRAINT bb_clearings_from_bank_id_fkey FOREIGN KEY (from_bank_id) REFERENCES public.banks(bank_id);


--
-- Name: bb_clearings bb_clearings_to_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.bb_clearings
    ADD CONSTRAINT bb_clearings_to_bank_id_fkey FOREIGN KEY (to_bank_id) REFERENCES public.banks(bank_id);


--
-- Name: cheque_books cheque_books_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheque_books
    ADD CONSTRAINT cheque_books_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id);


--
-- Name: cheque_bounces cheque_bounces_cheque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheque_bounces
    ADD CONSTRAINT cheque_bounces_cheque_id_fkey FOREIGN KEY (cheque_id) REFERENCES public.cheques(cheque_id);


--
-- Name: cheque_leaves cheque_leaves_cheque_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheque_leaves
    ADD CONSTRAINT cheque_leaves_cheque_book_id_fkey FOREIGN KEY (cheque_book_id) REFERENCES public.cheque_books(cheque_book_id);


--
-- Name: cheques cheques_depositor_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_depositor_account_id_fkey FOREIGN KEY (depositor_account_id) REFERENCES public.accounts(account_id);


--
-- Name: cheques cheques_drawer_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_drawer_account_id_fkey FOREIGN KEY (drawer_account_id) REFERENCES public.accounts(account_id);


--
-- Name: cheques cheques_drawer_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_drawer_bank_id_fkey FOREIGN KEY (drawer_bank_id) REFERENCES public.banks(bank_id);


--
-- Name: cheques cheques_leaf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_leaf_id_fkey FOREIGN KEY (leaf_id) REFERENCES public.cheque_leaves(leaf_id);


--
-- Name: cheques cheques_presenting_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_presenting_bank_id_fkey FOREIGN KEY (presenting_bank_id) REFERENCES public.banks(bank_id);


--
-- Name: customer_profiles customer_profiles_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id);


--
-- Name: deep_verifications deep_verifications_cheque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.deep_verifications
    ADD CONSTRAINT deep_verifications_cheque_id_fkey FOREIGN KEY (cheque_id) REFERENCES public.cheques(cheque_id);


--
-- Name: deep_verifications deep_verifications_matched_signature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.deep_verifications
    ADD CONSTRAINT deep_verifications_matched_signature_id_fkey FOREIGN KEY (matched_signature_id) REFERENCES public.account_signatures(signature_id);


--
-- Name: fraud_flags fraud_flags_cheque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.fraud_flags
    ADD CONSTRAINT fraud_flags_cheque_id_fkey FOREIGN KEY (cheque_id) REFERENCES public.cheques(cheque_id);


--
-- Name: initial_validations initial_validations_cheque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.initial_validations
    ADD CONSTRAINT initial_validations_cheque_id_fkey FOREIGN KEY (cheque_id) REFERENCES public.cheques(cheque_id);


--
-- Name: kyc_documents kyc_documents_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.kyc_documents
    ADD CONSTRAINT kyc_documents_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id);


--
-- Name: settlements settlements_cheque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_cheque_id_fkey FOREIGN KEY (cheque_id) REFERENCES public.cheques(cheque_id);


--
-- Name: settlements settlements_from_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.accounts(account_id);


--
-- Name: settlements settlements_to_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.accounts(account_id);


--
-- Name: transactions transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id);


--
-- Name: transactions transactions_cheque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_cheque_id_fkey FOREIGN KEY (cheque_id) REFERENCES public.cheques(cheque_id);


--
-- Name: transactions transactions_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chequemate_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.settlements(settlement_id);


--
-- PostgreSQL database dump complete
--

\unrestrict eDpnGfHQUPdRvub2c5wOXH0nnePda05MW8EbbWPkh2LeKiCDW8CML5iVoSKhl8n

